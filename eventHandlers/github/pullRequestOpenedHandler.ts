import {Config} from "../../config";
import {QueueMessage} from "../../interfaces/MessageInterfaces";
import {promises as fs} from "fs";

const logger = Config.logger

export async function pullRequestOpenedHandler(queueMessage: QueueMessage, octokit: any): Promise<void> {
    logger.info(`PR: ${queueMessage.parsedIncomingMessage.pull_request.url} - GitHub Pull Request created`)

    let {
        number: issueNumber,
        repository: {
            name: repoName,
            owner: {
                login: repoOwner
            }
        }
    } = queueMessage.parsedIncomingMessage;

    const fileBuffer = await fs.readFile('./templates/pullRequestOpened.md')
    const content = fileBuffer.toString()

    let issueComment = {
        owner: repoOwner,
        repo: repoName,
        issue_number: issueNumber,
        body: content
    }

    await octokit.issues.createComment(issueComment)
}
