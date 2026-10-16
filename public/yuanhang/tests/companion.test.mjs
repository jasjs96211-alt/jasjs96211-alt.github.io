import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const js=fileURLToPath(new URL('../wendao/companion.js',import.meta.url));
const root={};runInNewContext(readFileSync(js,'utf8'),root,{filename:js});
const P=root.WendaoCompanion;
test('陪伴日程在书案、药架与竹窗间循环，不修改真实修炼记录',()=>{
 assert.equal(P.selectAction({state:'normal'},0,false).place,'书案');
 assert.equal(P.selectAction({state:'normal'},360,false).place,'药架');
 assert.equal(P.selectAction({state:'normal'},720,false).place,'竹窗');
 assert.equal(P.selectAction({state:'normal'},1080,false).place,'书案');
});
test('姐姐重伤时卧榻休养，六分钟后仍不被当作健康角色',()=>{
 for(const elapsed of [0,360,720,3600,7200]){
  const action=P.selectAction({state:'injured'},elapsed,false);
  assert.equal(action.place,'榻边');
 }
});
test('病中不被强制走动；疲惫时会主动歇息',()=>{
 assert.equal(P.selectAction({state:'ill'},360,false).place,'榻边');
 assert.equal(P.selectAction({state:'tired'},360,false).place,'榻边');
});
test('暂停状态有明确标识，未知状态保守退回日常',()=>{
 assert.match(P.selectAction({state:'normal'},0,true).title,/暂歇/);
 assert.equal(P.selectAction({state:'unknown'},0,false).place,'书案');
});
