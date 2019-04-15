const axios = require('axios')

module.exports = (app) => {
  app.log('Loaded probot-run-circleci-job')

  app.on(['issue_comment.created', 'issue_comment.edited'], async (context) => {
    const { github, log } = context
    const { issue, comment, repository } = context.payload
    const { user } = comment
    log('Handle PR comment')

    if (!issue.pull_request || issue.state !== 'open' || user.type !== 'User') {
      log('Not an opened pull request or comment not from User')

      return
    }

    const match = comment.body.match(/run on circleci:\s*([a-zA-Z0-9\-\_])+\s*$/)

    if (!match) {
      log(`Not a run circleci command (${comment.body})`)

      return
    }

    const jobName = match[1]

    log(`Get branch name for PR #${issue.number}`)

    const { data: prData } = await github.pullRequests.get(
      context.repo({
        number: issue.number,
      })
    )

    const branchName = prData.head.ref

    log(`Branch is ${branchName}`)

    try {
      log(`Running job on circleci: ${jobName}`)
      const { data } = await axios.post(
        `https://circleci.com/api/v1.1/project/github/${repository.owner.login}/${repository.name}/tree/${branchName}?circle-token=${process.env.CIRCLE_TOKEN}`,
        {
          build_parameters: {
            CIRCLE_JOB: jobName,
          },
        }
      )
      await github.issues.createComment(
        context.issue({
          body: `Job scheduled: ${data.build_url}`,
        })
      )
      log(data)
    } catch (err) {
      log('Error running job on circleci')
      log(err)
    }
  })
}
