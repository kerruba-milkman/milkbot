import {pullRequestOpenedHandler} from "./pullRequestOpenedHandler";
import {issueCommentedHandler} from "./issueCommentedHandler";

export default {
    'pull_request.opened': pullRequestOpenedHandler,
    'issue_comment.created': issueCommentedHandler,
    'issue_comment.edited': issueCommentedHandler
}
