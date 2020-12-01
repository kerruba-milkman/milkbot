import {QueueMessage} from "../../../interfaces/MessageInterfaces";
import * as consts from "../../../consts";
import {CodeBuild} from "aws-sdk";
import {AwsBuild, BuildError} from "../../../utils/codeBuildUtils";
import {Config} from "../../../config";
import {createValidQueueMessage} from "../../../utils/messageUtils";
import {createFailedCommitStatus, createPendingCommitStatus, GithubCommit} from "../../../utils/githubUtils";
import {addMessageToQueue} from "../../../utils/sqsUtils";

const logger = Config.logger

export async function buildCommand(message: QueueMessage, octokit: any) {
    let {
        issue: {
            number: pull_number
        },
        repository: {
            name: repo,
            owner: {
                login: owner
            }
        }
    } = message.parsedIncomingMessage;

    if (!(repo in consts.CI_PROJECTS)) {
        logger.warn("Command issued on not supported project")
        let issueComment = {
            owner,
            repo,
            issue_number: pull_number,
            body: `:warning: This project is not yet covered by Continuous Integration. Please contact DevOps team for details :warning:`
        }

        await octokit.issues.createComment(issueComment)
        return
    }

    let pr;
    try {
        let prResponse = await octokit.pulls.get({
            owner,
            repo,
            pull_number
        })
        pr = prResponse.data

    } catch (e) {
        logger.warn("Command issued not on a pull-request", e)
        return
    }

    let {
        head: {
            sha: sha
        }
    } = pr

    let issueComment = {
        owner,
        repo,
        issue_number: pull_number,
        body: `Starting build for commit ${sha}`
    }

    await octokit.issues.createComment(issueComment)

    let options: CodeBuild.Types.StartBuildInput = {
        projectName: consts.CI_PROJECTS[repo],
        sourceVersion: sha,
    }

    let buildCommandInstance = new AwsBuild()
    let githubCommit: GithubCommit = {
        repoOwner: owner,
        repoName: repo,
        commitHash: sha
    }

    try {
        let {buildLink} = await buildCommandInstance.startBuild(options)
        await createPendingCommitStatus(githubCommit, buildLink).catch(e => {
            logger.error({buildId: buildCommandInstance.getBuildId(), commit: githubCommit, e}, "Error while creating pending status for new build")
        })
        let buildId = buildCommandInstance.getBuildId()

        let body = {
            action: 'check-build-status',
            github: githubCommit,
            build: {
                projectName: consts.CI_PROJECTS[repo],
                buildId
            }
        }
        let msgOptions = {
            headers: {"user-agent": "Milkman-GitHub-support"}
        }
        await addMessageToQueue(createValidQueueMessage(body, msgOptions))

    } catch (e) {
        if (e instanceof BuildError) {
            logger.error(`CI on project ${repo} for commit ${sha} failed`)
            await createFailedCommitStatus(githubCommit).catch(e => {
                logger.error({buildId: buildCommandInstance.getBuildId(), commit: githubCommit, e}, "Error while creating fail status for building not starting correctly")
            })
            return
        }
        logger.error(e, "An error occurred while building from Github")
    }
}
