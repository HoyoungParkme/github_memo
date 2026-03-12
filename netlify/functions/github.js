const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;

exports.handler = async function (event) {
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '서버 환경변수(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)가 설정되지 않았어.' }),
    };
  }

  const filePath = event.queryStringParameters?.path ?? '';
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  const fetchOptions = {
    method: event.httpMethod,
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (event.httpMethod !== 'GET' && event.body) {
    fetchOptions.body = event.body;
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json().catch(() => ({}));

  return {
    statusCode: response.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
