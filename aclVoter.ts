import * as AWS from 'aws-sdk'
import {Config} from './config'
import {ACLContent} from "./interfaces/ACLContent";
import * as consts from './consts'

async function getACLOfFunctionForMatchingRights(functionName: string, rightRegex: string): Promise<string[]> {
    let filteredRightsByRegex = consts.KNOWN_RIGHTS.filter(right => right.startsWith(rightRegex))
    const getDynamoData = filteredRightsByRegex.map((right) => {
        const params = {
            Key: {
                functionName,
                right
            },
            TableName: Config.getDynamoTableName()
        }
        return new Promise<string[]>((resolve, reject) => {
            const documentClient = new AWS.DynamoDB.DocumentClient(Config.getDynamoOptions())
            documentClient.get(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }

                if (!data.Item) {
                    Config.logger.error(`Missing entry in dynamo for function ${functionName} and right ${right}`)
                    data.Item = {
                        ids: ''
                    }
                }

                resolve(data.Item.ids.split(','))
            })
        })
    })

    const resolved = await Promise.all(getDynamoData)

    return Array.from(new Set([].concat(...resolved)))
}

const retrieveACLForFunction = async (functionName: string): Promise<ACLContent> => {
    return {
        deny: await getACLOfFunctionForMatchingRights(functionName, 'Deny'),
        allow: await getACLOfFunctionForMatchingRights(functionName, 'Allow')
    }
}

export async function canUserCallMe(userOrGroupIds: string[], functionName: string): Promise<boolean> {
    const functionACL = await retrieveACLForFunction(functionName)
    if (userOrGroupIds.find(userOrGroupId => functionACL.deny.includes(userOrGroupId))) {
        return false
    }

    if (userOrGroupIds.find(userOrGroupId => functionACL.allow.includes(userOrGroupId))) {
        return true
    }

    return false
}

