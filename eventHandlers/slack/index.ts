import {BotMessage} from "../../interfaces/MessageInterfaces";
import {echoHandler, userCannotExecuteCommandHandler,} from "./echoHandler";
import {fargateTasksStatusAction, getFargateTasksStatus} from "./fargateTaskStatusHandler";
import {getVonageStatus} from './vonageStatusHandler'
import {klaatu} from "./klaatuHandler";
import {handleLogs, searchLogsActions} from "./unzipLogHandler";
import {canUserCallMe} from "../../aclVoter";
import {fargateServicesStatusAction, getFargateServicesStatus} from "./fargateServiceStatusHandler";
import {handleHelp} from "./helpHandler";
import {deployForQAAction, handleDeployForQA} from "./deployForQAHandler";
import {handleTurnOffQA} from "./turnOffQAHandler";
import {alarmHandler} from "./alarmHandler";
import {getUserGroups} from "../../utils/slackUtils";
import {buildAction, handleBuild} from "./buildHandler";
import {parseCommand} from "../../utils/messageUtils";

async function getUserOrGroupIds(incomingMessage: BotMessage): Promise<string[]> {
    let userGroups = await getUserGroups(incomingMessage.user)
    return [...userGroups, incomingMessage.user]
}

export async function handleAppMention(incomingMessage: BotMessage): Promise<BotMessage> {

    if (typeof incomingMessage.inputMessageFromUser !== 'undefined' && incomingMessage.inputMessageFromUser) {
        let userOrGroupsIds = await getUserOrGroupIds(incomingMessage);
        incomingMessage.command = parseCommand(incomingMessage.inputMessageFromUser)
        if (!incomingMessage.command) {
            return echoHandler(incomingMessage)
        }

        if (incomingMessage.command.command === "klaatu") {
            return klaatu(incomingMessage)
        }
        if (incomingMessage.command.command === 'search-logs') {
            if (incomingMessage.user && await canUserCallMe(userOrGroupsIds, handleLogs.name)) {
                return handleLogs(incomingMessage)
            }
            return userCannotExecuteCommandHandler(incomingMessage)
        }

        if (incomingMessage.command.command === 'task-status') {
            if (incomingMessage.user && await canUserCallMe(userOrGroupsIds, getFargateTasksStatus.name)) {
                return getFargateTasksStatus(incomingMessage);
            }
            return userCannotExecuteCommandHandler(incomingMessage)
        }

        if (incomingMessage.command.command === 'services-status') {
            if (incomingMessage.user && await canUserCallMe(userOrGroupsIds, getFargateServicesStatus.name)) {
                return getFargateServicesStatus(incomingMessage);
            }
            return userCannotExecuteCommandHandler(incomingMessage)
        }

        if (incomingMessage.command.command === 'deploy-for-qa') {
            if (incomingMessage.user && await canUserCallMe(userOrGroupsIds, handleDeployForQA.name)) {
                return handleDeployForQA(incomingMessage);
            }
            return userCannotExecuteCommandHandler(incomingMessage)
        }

        if (incomingMessage.command.command === 'build') {
            if (incomingMessage.user && await canUserCallMe(userOrGroupsIds, handleBuild.name))
                return handleBuild(incomingMessage)
            return userCannotExecuteCommandHandler(incomingMessage)
        }

        if (incomingMessage.command.command === 'turn-off-qa') {
            if (incomingMessage.user && await canUserCallMe(userOrGroupsIds, getFargateServicesStatus.name)) {
                return handleTurnOffQA(incomingMessage);
            }
            return userCannotExecuteCommandHandler(incomingMessage)
        }

        if (incomingMessage.command.command === 'help') {
            return handleHelp(incomingMessage)
        }

        if (incomingMessage.command.command === 'vonage-status') {
            if (incomingMessage.user && await canUserCallMe(userOrGroupsIds, getVonageStatus.name)) {
                return getVonageStatus(incomingMessage);
            }
            return userCannotExecuteCommandHandler(incomingMessage)

        }

        return echoHandler(incomingMessage)
    }
}

export async function handleAction(incomingMessage: BotMessage): Promise<BotMessage> {

    const unzipLogAction = incomingMessage.actions.find((action: any) => action.action_id === 'search_logs')
    if (unzipLogAction) {
        return await searchLogsActions(incomingMessage)
    }
    const fargateTaskStatus = incomingMessage.actions.find((action: any) => action.action_id === 'fargate_tasks_status')
    if (fargateTaskStatus) {
        return await fargateTasksStatusAction(incomingMessage)
    }
    const fargateServicesStatus = incomingMessage.actions.find((action: any) => action.action_id === 'fargate_services_status')
    if (fargateServicesStatus) {
        return await fargateServicesStatusAction(incomingMessage)
    }
    const deployForQA = incomingMessage.actions.find((action: any) => action.action_id === 'deploy_for_qa')
    if (deployForQA) {
        return await deployForQAAction(incomingMessage)
    }
    const doBuild = incomingMessage.actions.find((action: any) => action.action_id === 'build')
    if (doBuild)
        return await buildAction(incomingMessage)

    return echoHandler(incomingMessage)
}

export async function handleNotification(incomingMessage: BotMessage): Promise<BotMessage> {
    if (incomingMessage.inputMessageFromUser.includes('"AlarmArn"')) {
        return alarmHandler(incomingMessage)
    }
    return echoHandler(incomingMessage)
}
