import {Config} from "../../config";
import {QueueMessage} from "../../interfaces/MessageInterfaces";
import {parseGithubCommand} from "../../utils/messageUtils";
import {buildCommand} from "./commands/buildCommand";

const logger = Config.logger

export async function issueCommentedHandler(queueMessage: QueueMessage, octokit: any): Promise<void> {
    let command = parseGithubCommand(queueMessage.parsedIncomingMessage.comment.body)
    if (!command) {
        logger.info("No command has been found in the comment")
        return
    }
    let commandIssuer = queueMessage.parsedIncomingMessage.sender.login
    logger.info(`Received command ${command} from ${commandIssuer}`)
    let result
    switch (command) {
        case '/build':
            result = await buildCommand(queueMessage, octokit)
            break
    }
}
