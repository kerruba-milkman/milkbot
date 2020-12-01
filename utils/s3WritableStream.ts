import {Writable} from "stream";
import {S3} from "aws-sdk";
import {BotMessage} from "../interfaces/MessageInterfaces";
import * as pino from "pino";
import {WebClient} from "@slack/web-api"
import {Config} from '../config'

const slackClient = new WebClient(Config.token);

const logger = pino({
    name: 'main logger',
    level: process.env.LOG_LEVEL || 'info'
})

class S3WritableStream extends Writable {

    private s3Client: S3;
    private buffer = ''
    private partSize = 1024 * 1024 * 5; // 5mb chunks except last part

    private multipartParams
    private uploadId
    private multipartMap = {
        Parts: []
    }

    private partNum: number
    private startTime: number
    private maxUploadTries: number = 3
    private currInst;

    //this is here because we can't say when the upload is finished, so we notify slack user.
    private writeOnSlackData

    constructor(client: S3) {
        super();
        this.s3Client = client;
    }

    async init(bucketName, fileName, botMessage: BotMessage) {
        this.multipartParams = {
            Bucket: bucketName,
            Key: fileName,
            ContentType: 'plain/text'
        };

        const multipart = await this.s3Client.createMultipartUpload(this.multipartParams).promise().then((response) => {
            return response
        }).catch((e) => {
            logger.error(e, "Error on creating multipart upload")
        })
        if (multipart) {
            this.uploadId = multipart.UploadId
        }

        this.partNum = 0
        this.startTime = new Date().getTime()

        this.writeOnSlackData = botMessage

        return this.uploadId
    }

    write(chunk, encoding, callback?): boolean {
        this.buffer += "\n" + chunk

        const length = this.buffer.length

        if (length >= this.partSize) {
            this.partNum++

            let partParams = {
                Body: this.buffer,
                Bucket: this.multipartParams.Bucket,
                Key: this.multipartParams.Key,
                PartNumber: String(this.partNum),
                UploadId: this.uploadId
            };

            this.uploadPart(partParams, 1, 3, this.multipartMap, false, this.writeOnSlackData)
            this.buffer = ''
        }
        return true
    }

    end(chunk, cb?) {

        logger.info("closing the multipart upload with last items in the buffer")
        if (this.buffer && this.buffer.length == 0) {
            this.buffer = 'No data found.'
            logger.info("No data was found in the log search")
        }
        this.partNum++
        let partParams = {
            Body: this.buffer,
            Bucket: this.multipartParams.Bucket,
            Key: this.multipartParams.Key,
            PartNumber: String(this.partNum),
            UploadId: this.uploadId
        }


        this.uploadPart(partParams, 1, 3, this.multipartMap, true, this.writeOnSlackData).then(() => {
            this.buffer = ''
        })

        super.end()
    }

    private uploadPart(partParams, tryNum, maxUploadTries, multipartMap, closeMultipartUpload, writeOnSlackData): Promise<boolean> {
        //TODO I've change
        let currInst = this;

        return new Promise((resolve, reject) => {
            logger.info('Upload for part ' + partParams.PartNumber + ' starting. Size is ' + partParams.Body.length);
            currInst.s3Client.uploadPart(partParams, function (multiErr, mData) {
                if (multiErr) {
                    logger.error('Upload part error:', multiErr);

                    if (tryNum < maxUploadTries) {
                        logger.warn('Retrying upload of part: #', partParams.PartNumber);
                        return resolve(currInst.uploadPart(partParams, tryNum + 1, maxUploadTries, multipartMap, closeMultipartUpload, writeOnSlackData));
                    } else {
                        reject('Failed uploading part: #' + partParams.PartNumber)
                    }
                }

                multipartMap.Parts[this.request.params.PartNumber - 1] = {
                    ETag: mData.ETag,
                    PartNumber: Number(this.request.params.PartNumber)
                };
                logger.info('Completed part' + this.request.params.PartNumber + ' with mData ' + mData);

                if (closeMultipartUpload) {
                    let doneParams = {
                        Bucket: this.request.params.Bucket,
                        Key: this.request.params.Key,
                        MultipartUpload: multipartMap,
                        UploadId: this.request.params.UploadId
                    };

                    currInst.s3Client.completeMultipartUpload(doneParams, function (err, data) {
                        if (err) {
                            logger.error('An error occurred while completing multipart upload ' + err.message)
                        }
                        let delta = (new Date().getTime() - this.startTime) / 1000;
                        logger.info('Final upload data:', data);
                    }).promise().then((response) => {
                        slackClient.chat.postMessage({
                            channel: writeOnSlackData.requestChannelId,
                            text: "Upload completed",
                            blocks: [
                                {
                                    type: "section" as const,
                                    block_id: "section1",
                                    text: {
                                        type: "mrkdwn" as const,
                                        text: ":checkered_flag: The upload is finished. Please check the path in the link above."
                                    }
                                }
                            ]
                        });
                        logger.info("Multipart upload completed")
                    }).catch((e) => {
                        logger.error(e, "Error on completing multipart upload")
                    })
                }
                resolve(true)
            })
        })
    }
}
