import {BotMessage} from "../../interfaces/MessageInterfaces";

export function alarmHandler(botMessage: BotMessage): BotMessage {
    let message = JSON.parse(botMessage.inputMessageFromUser)
    botMessage.chatPostMessageArguments = {
        channel: botMessage.requestChannelId,
        text: ':rotating_light:  ALARM',
        blocks: [
            {
                type: 'section' as const,
                block_id: 'section1',
                text: {
                    type: 'mrkdwn' as const,
                    text: `:rotating_light:  *${message.AlarmName}* has been triggered`
                }
            },
            {
                type: 'section' as const,
                block_id: 'section2',
                text: {
                    type: 'mrkdwn' as const,
                    text: `There is a message in the DLQ ${message.AlarmDescription}`
                }
            }
        ]
    }
    return botMessage
}
