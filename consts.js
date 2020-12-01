module.exports = {
    ERROR_MISSING_DATA_IN_MESSAGE: 'Missing required data in the message',
    SEARCH_STRING_PARAMS_SEPARATOR: '&&&',
    DEPLOY_FOR_QA_COMMAND: 'deploy-for-qa',
    MILKBOT_ECR_TAG_ARG_NAME: 'EcrTag',
    MILKBOT_HOURS_ARG_NAME: 'MilkbotLogHours',
    MILKBOT_TIMESTAMP_ARG_NAME: 'MilkbotLogTimestamp',
    MANAGED_ENV: {
        qa: [
            {
                region: 'us-east-1',
                deployRole: 'arn:aws:iam::854866917001:role/milkbotRole',
                cluster: 'mt-qa-qual'
            }
            ],
        qa2: [
            {
                region: 'us-east-1',
                deployRole: 'arn:aws:iam::786560659792:role/milkbotRole',
                cluster: 'mt-qa2-qual'
            }
            ],
        ff: [
            {
                region: 'us-east-1',
                deployRole: 'arn:aws:iam::181679519318:role/milkbotRole',
                cluster: 'mt-ff-prod'
            }
            ],
        ffs: [
            {
                region: 'us-east-1',
                deployRole: 'arn:aws:iam::425779584678:role/milkbotRole',
                cluster: 'ffs-prod'
            }
        ],
        pu: [
            {
                region: 'eu-central-1',
                deployRole: 'arn:aws:iam::785798395236:role/milkbotRole',
                cluster: 'pu-prod'
            }
        ],
        ho: [
            {
                region: 'eu-central-1',
                deployRole: 'arn:aws:iam::028392612484:role/milkbotRole',
                cluster: 'ho-prod'
            }
        ]
    },
    CODEBUILD_TO_FARGATE_SERVICE: {
        'api-tech': {
            buildspecFolder: 'ApiFargateService',
            serviceToRestart: 'ApiFargateService'
        },
        'api-dashboard-tech': {
            buildspecFolder: 'ApiFargateDashboard',
            serviceToRestart: 'ApiFargateService'
        },
        'routing-dev': {
            buildspecFolder: 'RoutingFargateService',
            serviceToRestart: 'RoutingFargateService'
        }
    },
    CI_PROJECTS: {
        'c-panel': 'dashboard-ci',
        'milkman-webApp': 'tracking-ci',
        'milkman-api': 'api-ci',
        'playground': 'playground',
        "milkbot": 'milkbot-ci'
    },
    KNOWN_RIGHTS: [
        "AllowUsers",
        "AllowGroups",
        "DenyUsers",
        "DenyGroups"
    ]
}
