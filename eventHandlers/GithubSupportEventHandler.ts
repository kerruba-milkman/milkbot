import {Config} from "../config";
import {EventHandler} from "./EventHandler";
import {QueueMessage} from "../interfaces/MessageInterfaces";
import supportHandlers from "./support/github"

const logger = Config.logger

export class GithubSupportEventHandler implements EventHandler {
    async handleMessage(queueMessage: QueueMessage) {

        let supportAction = queueMessage.parsedIncomingMessage.action
        let eventOutcome = {preserveMessage: false}

        if (supportAction in supportHandlers) {
            //TODO Give context to
            logger.info(`Handling support event ${supportAction}`)
            eventOutcome = await supportHandlers[supportAction](queueMessage)
        } else {
            logger.info(`Action ${supportAction} is not supported by this bot right now.`)
        }

        return eventOutcome
    }
}
