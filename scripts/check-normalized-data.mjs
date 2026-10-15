import { writeFile,mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scholarships } from '../src/data/normalized.js';
const dir=await mkdtemp(join(tmpdir(),'career-track-data-'));
try{const path=join(dir,'normalized.json');await writeFile(path,JSON.stringify(scholarships));const result=spawnSync(process.execPath,['scripts/check-data.mjs',path],{stdio:'inherit'});process.exitCode=result.status??1;}finally{await rm(dir,{recursive:true,force:true});}
