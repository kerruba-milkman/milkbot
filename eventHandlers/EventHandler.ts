import {GithubEventHandler} from "./GithubEventHandler";
import {SlackEventHandler} from "./SlackEventHandler";
import {QueueMessage} from "../interfaces/MessageInterfaces";
import {GithubSupportEventHandler} from "./GithubSupportEventHandler";

function isGithubEvent(headers: any): boolean {
    return headers && headers['user-agent'] && headers["user-agent"].match(/^GitHub-Hookshot/i)
}

function isGithubSupportEvent(headers: any): boolean {
    return headers && headers['user-agent'] && headers['user-agent'].match(/^Milkman-GitHub-support/i)
}

export class EventHandlerFactory {
    public static createEventHandler(headers: any): EventHandler {
        if (isGithubSupportEvent(headers)) {
            return new GithubSupportEventHandler()
        } else if (isGithubEvent(headers)) {
            return new GithubEventHandler()
        }
        return new SlackEventHandler()
    }
}

export interface EventHandler {
    handleMessage(message: QueueMessage): Promise<EventOutcome>
}

export interface EventOutcome {
    message?: string
    preserveMessage?: boolean
}
