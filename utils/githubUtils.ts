import {Octokit} from "@octokit/rest";
import {AwsBuild} from "./codeBuildUtils";

const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN
})

export interface GithubCommit {
    repoOwner: string
    repoName: string
    commitHash: string
}

export async function createSuccessCommitStatus(githubCommit: GithubCommit, buildLink?: string) {
    let {
        repoOwner: owner,
        repoName: repo,
        commitHash: sha
    } = githubCommit

    await octokit.repos.createCommitStatus({
        owner,
        repo,
        sha,
        state: 'success',
        description: 'CI has completed successfully, all is fine',
        context: 'CI test',
        target_url: buildLink
    });
}

export async function createFailedCommitStatus(githubCommit: GithubCommit, buildLink?: string) {
    let {
        repoOwner: owner,
        repoName: repo,
        commitHash: sha
    } = githubCommit
    await octokit.repos.createCommitStatus({
        owner,
        repo,
        sha,
        state: 'failure',
        description: 'CI Build failed, all is fine. Please check CodeBuild for details',
        context: 'CI test',
        target_url: buildLink
    });
}

export async function createPendingCommitStatus(githubCommit: GithubCommit, buildLink?: string) {
    let {
        repoOwner: owner,
        repoName: repo,
        commitHash: sha
    } = githubCommit
    await octokit.repos.createCommitStatus({
        owner,
        repo,
        sha,
        state: 'pending',
        description: 'CI started, check details for status updates',
        context: 'CI test',
        target_url: buildLink
    })

}

export async function createCommitStatusForBuild(github: GithubCommit, build: AwsBuild) {

    let buildLink = build.getBuildLink()

    if (!await build.isCompleted()) {
        await this.createPendingCommitStatus(github, buildLink)
    } else {
        let buildStatus = await build.getBuildStatus()
        if (buildStatus === 'SUCCEEDED') {
            await this.createSuccessCommitStatus(github, buildLink)
        } else {
            await this.createFailedCommitStatus(github, buildLink)
        }
    }

}
