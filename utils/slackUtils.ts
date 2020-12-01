import {WebClient} from '@slack/web-api'
import {Config} from '../config'
import {BotMessage} from "../interfaces/MessageInterfaces";

const logger = Config.logger

const web = new WebClient(Config.token)

let userGroups = {}

export async function getUserGroups(slackUserId: string): Promise<string[]> {
    if (userGroups.hasOwnProperty(slackUserId)) {
        return userGroups[slackUserId]
    }

    let users = []
    let groups: any = await web.usergroups.list({include_users: true})

    if (!groups.usergroups) {
        return users
    }

    for (let userGroupIndex in groups.usergroups) {
        let userGroup = groups.usergroups[userGroupIndex]

        for (let userIndex in userGroup.users) {
            if (slackUserId === userGroup.users[userIndex]) {
                users.push(userGroup.id)
            }
        }
    }

    userGroups[slackUserId] = users
    return users
}

export async function sendMessageToSlackChannel(botMessage: BotMessage) {
    // Post a message to the channel, and await the result.
    logger.info('sending message in conversation ' + botMessage.requestChannelId);
    switch (botMessage.expectedResponseType) {
        case 'chat':
            return await web.chat.postMessage(botMessage.chatPostMessageArguments);
        case 'file':
            return await web.files.upload({
                channels: botMessage.requestChannelId,
                content: botMessage.fileToUpload,
                filename: 'some_name' + Math.random() + '.json',
                filetype: 'javascript'
            });
        default:
            throw (new Error('unmanaged expectedResponseType'))
    }
}
