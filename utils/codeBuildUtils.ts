import * as pino from 'pino'
import * as AWS from 'aws-sdk'
import {CodeBuild} from 'aws-sdk'
import moment = require("moment");

const logger = pino({
    name: 'main logger',
    level: process.env.LOG_LEVEL || 'info'
})

AWS.config.update({
    region: process.env.AWS_REGION
})

export class BuildStatus {
    buildLink: string
    status: string
}

export class BuildStatusTimeoutError extends Error {
}

export class BuildError extends Error {
    public buildLink: string
    public status: string

    constructor(status: string, buildLInk?: string) {
        super(status);
        this.status = status
        this.buildLink = buildLInk
    }
}

export class AwsBuild {
    private params: CodeBuild.Types.StartBuildInput
    private readonly codeBuild: CodeBuild
    private buildId: string
    private projectName: string


    constructor(build?: { buildId: string, projectName: string }) {
        this.codeBuild = new AWS.CodeBuild({
            apiVersion: '2016-10-06'
        })
        if (build) {
            this.buildId = build.buildId
            this.projectName = build.projectName
        }
    }

    async startBuild(params: CodeBuild.Types.StartBuildInput): Promise<BuildStatus> {
        // Check if already started
        this.params = params
        let codeBuildResponse = this.codeBuild.startBuild(this.params)

        let buildId = await codeBuildResponse.promise().then((response) => {
            logger.info({params, response}, "Started Build " + response.build.id, )
            return response.build.id
        }).catch((error) => {
            logger.error(error)
            return error
        })

        if (buildId instanceof Error) {
            throw new BuildError('Error during starting build')
        }
        this.buildId = buildId
        this.projectName = params.projectName

        return ({buildLink: this.getBuildLink(), status: 'Build started'})
    }

    getBuildId() {
        return this.buildId
    }

    async getBuildStatus(): Promise<string> {
        this.failIfMissingRequiredBuildDetails()
        let params = {
            ids: [this.buildId]
        }

        let getBuildsResponse = this.codeBuild.batchGetBuilds(params)

        return await getBuildsResponse.promise().then((response) => {
            logger.info(response, "Got build status for " + this.buildId)
            return response.builds[0].buildStatus
        }).catch((error) => {
            logger.error(error)
            return error
        })
    }

    async isCompleted() {
        return await this.getBuildStatus() !== "IN_PROGRESS"
    }

    async waitCompletion(): Promise<BuildStatus> {
        return await this.waitCompletionAtMost(-1)
    }

    async waitCompletionAtMost(milliseconds: number): Promise<BuildStatus> {
        this.failIfMissingRequiredBuildDetails()
        const iterator = this.getStatusGenerator(milliseconds)

        let item
        for await (item of iterator) {
            logger.info(item, "Status of build " + this.buildId)
            if (!['IN_PROGRESS', 'SUCCEEDED'].includes(item)) {
                throw new BuildError(`Build does not complete successfully.`, this.getBuildLink())
            }
        }
        return ({buildLink: this.getBuildLink(), status: item})

    }

    private async* getStatusGenerator(maxTimeout?: number) {
        let status, maxWaitTime

        if (maxTimeout && maxTimeout > 0) {
            maxWaitTime = moment().add(maxTimeout, 'millisecond')
        }
        do {
            if (maxTimeout && moment().isAfter(maxWaitTime)) {
                throw new BuildStatusTimeoutError(`Build check timeout`)
            } else {
                status = await this.getBuildStatus()
                if (status.includes('IN_PROGRESS')) {
                    logger.info("Starting a new wait cycle for build " + this.buildId)
                    await this.waitForNewStatus()
                }
                yield status
            }
        } while (['IN_PROGRESS'].includes(status))

    }

    getBuildLink() {
        this.failIfMissingRequiredBuildDetails()
        return `https://${process.env.AWS_REGION}.console.aws.amazon.com/codesuite/codebuild/263652615682/projects/${this.projectName}/build/${this.buildId}`
    }

    failIfMissingRequiredBuildDetails() {
        if (!this.buildId) {
            throw Error("Build id is missing")
        }
        if (!this.projectName) {
            throw Error("Project name is missing")
        }
    }

    async waitForNewStatus() {
        await (new Promise((resolve) => {
            setTimeout(resolve, 5000)
        }))
    }

}

