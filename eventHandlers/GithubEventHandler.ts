import {EventHandler} from "./EventHandler";
import {QueueMessage} from "../interfaces/MessageInterfaces";
import ghHandlers from './github'
import {Config} from "../config";
import {Octokit} from "@octokit/rest";

const logger = Config.logger

export class GithubEventHandler implements EventHandler {
    async handleMessage(queueMessage: QueueMessage) {
        const githubEvent = queueMessage.parsedMessageBody.headers["x-github-event"]
        const githubAction = queueMessage.parsedIncomingMessage.action
        const githubFullEvent = `${githubEvent}.${githubAction}`

        if (githubFullEvent in ghHandlers) {
            const octokit = new Octokit({
                auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN
            })
            logger.info(queueMessage.message, `Handling GitHub event ${githubFullEvent}`)
            await ghHandlers[githubFullEvent](queueMessage, octokit)
        } else {
            logger.info(`Action ${githubFullEvent} is not supported by this bot right now.`)
        }

        return {message: "GitHub Handler has finished its duty.", preserveMessage: false}
    }
}
