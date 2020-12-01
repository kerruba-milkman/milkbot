import {Config} from "../../../config";
import {AwsBuild, BuildError, BuildStatusTimeoutError} from "../../../utils/codeBuildUtils";
import {removeMessageFromQueue, updateMessageVisibility} from "../../../utils/sqsUtils";
import {createCommitStatusForBuild} from "../../../utils/githubUtils";
import {EventOutcome} from "../../EventHandler";
import {QueueMessage} from "../../../interfaces/MessageInterfaces";

export const DEFAULT_MESSAGE_VISIBILITY_INCREMENT_IN_SEC = 60
export const DEFAULT_WAIT_STATUS_TIMEOUT_IN_SEC = 30

const logger = Config.logger

export async function checkContinuousIntegrationBuildStatus(queueMessage: QueueMessage) {

    let {
        build,
    } = queueMessage.parsedIncomingMessage

    let buildCommand = new AwsBuild(build)
    let messageReceiptHandle = queueMessage.message.ReceiptHandle
    let newVisibility = 2 * DEFAULT_MESSAGE_VISIBILITY_INCREMENT_IN_SEC
    let maxWaitingTime = 2 * DEFAULT_WAIT_STATUS_TIMEOUT_IN_SEC * 1000

    while (!await buildCommand.isCompleted()) {

        try {

            await updateMessageVisibility(messageReceiptHandle, newVisibility)
            await buildCommand.waitCompletionAtMost(maxWaitingTime)

        } catch (e) {
            if (e instanceof BuildStatusTimeoutError) {
                newVisibility += DEFAULT_MESSAGE_VISIBILITY_INCREMENT_IN_SEC
                maxWaitingTime = DEFAULT_WAIT_STATUS_TIMEOUT_IN_SEC * 1000
                logger.warn(build, "Build status check timeout, incrementing message visibility")
            } else if (e instanceof BuildError) {
                logger.info(build, "Build did not complete successfully")
                break
            } else {
                logger.error({build, e}, "Unexpected exception during build status check")
                throw e
            }
        }

    }

    await createCommitStatusForBuild(queueMessage.parsedIncomingMessage.github, buildCommand).catch(e => {
        logger.error({message: queueMessage.message, e}, "Error while creating commit status for build " + build.buildID)
    })

    logger.info(queueMessage.message, "Removing check status message from the queue")

    removeMessageFromQueue(queueMessage.message.ReceiptHandle).catch((e) => {
        logger.error({message:queueMessage.message, e}, "Error while removing message from the queue")
    })
}

export function getDefaultOutcome() {
    return {message: "Checking build status", preserveMessage: true};
}

function nonBlockingCheckContinuousIntegrationBuildStatus (queueMessage) {
    checkContinuousIntegrationBuildStatus(queueMessage).catch(e => {
        logger.error({message: queueMessage.message, e}, "Unexpected exception from non blocking check build status")
    })
}

export function checkBuildStatusHandler(queueMessage): EventOutcome {
    nonBlockingCheckContinuousIntegrationBuildStatus(queueMessage)
    return getDefaultOutcome()
}
