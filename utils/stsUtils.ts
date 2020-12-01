import moment = require("moment");
import * as pino from "pino";
import * as AWS from 'aws-sdk'
import {AssumeRoleResponse} from "aws-sdk/clients/sts";

const logger = pino({
    name: 'main logger',
    level: process.env.LOG_LEVEL || 'info'
})


export async function assumeRole(role: string): Promise<AssumeRoleResponse> {
    let sts = new AWS.STS({
        apiVersion: '2011-06-15'
    })

    let assumeRoleParameters = {
        RoleArn: role,
        RoleSessionName: `Milkbot${moment().valueOf()}`,
        DurationSeconds: 3600
    }

    let assumedRole = await sts.assumeRole(assumeRoleParameters).promise().then((response) => {
        return response
    }).catch((error) => {
        logger.error(error)
        return error
    })

    if (assumedRole instanceof Error) {
        throw assumedRole
    }

    return assumedRole
}