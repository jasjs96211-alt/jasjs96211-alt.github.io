// Only the repository-root ignored env file is loaded; never serve it over HTTP.
import {fileURLToPath} from 'node:url';
export const environmentPath=fileURLToPath(new URL('../../../../.env.local',import.meta.url));
try { process.loadEnvFile(environmentPath); }
catch (error) { if(error.code!=='ENOENT')throw Error('无法读取项目 .env.local；请检查文件权限与格式'); }
