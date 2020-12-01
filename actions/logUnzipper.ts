import {CloudWatchLogs, S3} from "aws-sdk"
import {FilteredLogEvents, FilterLogEventsResponse} from "aws-sdk/clients/cloudwatchlogs"
import {BotMessage} from "../interfaces/MessageInterfaces"
import * as pino from "pino"
import * as consts from '../consts';
import {unzipLogs} from "../utils/cloudWatchLogsUtils";
import moment = require("moment");

const reId = RegExp(/"i":"(?<i>[a-zA-Z0-9\-]+)/)
const reZip = RegExp(/"z":(?<z>[01])"/)
const reTotPages = RegExp(/"totPages":(?<totPages>\d+)/)
const reCurrentPage = RegExp(/"currentPage":(?<currentPage>\d+)/)
const reIsLast = RegExp(/"isLast":(?<isLast>true)/)
const reContent = RegExp(/"c":"(?<c>.*)\s?/)

const logger = pino({
    name: 'main logger',
    level: process.env.LOG_LEVEL || 'info'
})

interface LogSearchOptions {
    timestamp?: moment.Moment,
    intervalInMinutes?: number
}

const eventRetriever = async (id, args: string, logGroupName, i: BotMessage, region?: string) => {
    let clodWatchClient = new CloudWatchLogs({region: 'eu-central-1'})
    let s3Client = new S3({region: 'eu-central-1'});
    if (region) {
        clodWatchClient = new CloudWatchLogs({region})
        s3Client = new S3({region});
    }

    const unixNow = moment()
    const defaultOptions: LogSearchOptions = {timestamp: unixNow, intervalInMinutes: 60}
    const options = parseLogOptions(args, defaultOptions)
    const bucketName = 'large-logs';
    const fileName = 'logsearch_' + new Date().getTime() + '.log'

    let startTime = options.timestamp.clone().subtract(options.intervalInMinutes, 'minute')
    let endTime = options.timestamp === unixNow
        ? unixNow.clone()
        : options.timestamp.clone().add(options.intervalInMinutes, 'minute')

    let params = {
        logGroupName,
        limit: 10000,
        startTime: startTime.valueOf(),
        endTime: endTime.valueOf(),
        filterPattern: `"${id}"`
    }
    let queryParams = {...params}
    logger.debug("CloudWatch filter params: ", JSON.stringify(params));

    let allEvents = []

    let finished = false;
    logger.info("Log search started")
    while (!finished) {
        try {
            const partial = await retrieveLogEntries(params, clodWatchClient)

            allEvents = [...allEvents, ...partial.events]
            logger.debug("Parsing a page of log entries")
            if (!partial.nextToken) {
                finished = true
                logger.info(`Finished retrieving all the logs for id ${id}`)
                break;
            }
            params['nextToken'] = partial.nextToken
        } catch (err) {
            finished = true
            logger.error(err, `Error in retrieving log entries, exiting the loop early`)
        }
    }

    logger.info(`Logs search completed, retrieved  ${allEvents.length} entries for id ${id}`)

    if (allEvents.length === 0) {
        return ""
    }

    let fullLoggedMessage = cumulateLogs(allEvents)
    let s3PutParams = {
        Bucket: bucketName,
        Key: fileName,
        ContentType: 'plain/text',
        Body: JSON.stringify({query: queryParams, result: fullLoggedMessage})
    }

    logger.info(`Uploading logs to S3`)
    s3Client.upload(s3PutParams, (err, data) => {
        if (err) {
            logger.error(err, 'An error occurred while uploading log message to S3')
            return
        }
        logger.info(`Successfully uploaded ${data.Key} in S3 Bucket ${data.Bucket}`)
    })

    let s3Link = 'https://' + bucketName + '.s3.eu-central-1.amazonaws.com/' + fileName
    return s3Link
}

async function retrieveLogEntries(params, client: CloudWatchLogs): Promise<FilterLogEventsResponse> {
    return new Promise((resolve, reject) => {
        client.filterLogEvents(params, function (err, data) {
            if (err) {
                logger.error(err, err.stack)
                return reject(err)
            }
            return resolve(data)
        })
    })
}

function validateMessageObjArray(objArray) {
    if (objArray.length == 0) {
        throw Error("No events to cumulate")
    }
    if (!objArray.every(o => o.hasOwnProperty("c"))) {
        throw Error("Logs are missing content field 'c'")
    }
    let ids = [...new Set(objArray.map(ob => ob["i"]))]
    if (ids.length > 1) {
        throw Error(`Cannot combine logs with different ids: ${ids.slice(1).reduce((p, c) => p + ", " + c, ids[0])}`)
    }
    const isZipEvents = objArray[0]["z"]
    if (!objArray.every(o => o["z"] == isZipEvents)) {
        throw Error("Inconsistent zipped messages")
    }

    const totalPages = objArray[0]["totPages"]
    if (totalPages && objArray.length != totalPages) {
        throw Error("Missing messages to fully build the split log")
    }
}

function parseLogOptions(args, defaultOptions: LogSearchOptions) {
    //get args array in format ['Key1=Value1', 'Key2=Value2']
    let splitArgs = args.split(",")

    //Create managed args with default value
    let opt = {...defaultOptions}

    //if the arg is managed, change default value
    for (let arg of splitArgs) {
        let keyValue = arg.split('=')
        if (keyValue[0] === consts.MILKBOT_TIMESTAMP_ARG_NAME) {
            let value = Number.parseInt(keyValue[1])
            if (Number.isInteger(value)) {
                opt.timestamp = moment(value)
            }
        }
    }

    return opt
}

function createEventFromMalformedJSON(event: CloudWatchLogs.FilteredLogEvent) {
    let message = event.message;
    let obj = {
        i: reId.test(message) ? message.match(reId).groups["i"] : undefined,
        z: reZip.test(message) ? message.match(reZip).groups["z"] : undefined,
        totPages: reTotPages.test(message) ? message.match(reTotPages).groups["totPages"] : undefined,
        currentPage: reCurrentPage.test(message) ? message.match(reCurrentPage).groups["currentPage"] : undefined,
        isLast: reIsLast.test(message) ? message.match(reIsLast).groups["isLast"] : undefined,
        c: reContent.test(message) ? message.match(reContent).groups["c"] : undefined
    }
    return obj

}

function cumulateLogs(events: FilteredLogEvents): string {

    let output = ""
    if (events.length == 0) return output

    let eventObjs = events.map(event => {
        try {
            return JSON.parse(event.message)
        } catch (e) {
            return createEventFromMalformedJSON(event)
        }
    })
    validateMessageObjArray(eventObjs);

    let refObj = eventObjs[0]

    let isZipped = refObj.hasOwnProperty("z") && refObj["z"] === 1;
    output = eventObjs
        .sort((e1, e2) => {
            return e1["currentPage"] - e2["currentPage"];
        })
        .map(e => e["c"])
        .reduce((prev, curr) => {
            return prev + curr
        }, "")

    if (isZipped) {
        output = unzipLogs(output);
    }

    return output;
}

async function retrieveUnzippedLogEntry(id, args, logGroupName, i: BotMessage): Promise<string> {
    const s3Link = await eventRetriever(id, args, logGroupName, i)
    return s3Link
}

export {
    parseLogOptions,
    cumulateLogs,
    retrieveUnzippedLogEntry

}

