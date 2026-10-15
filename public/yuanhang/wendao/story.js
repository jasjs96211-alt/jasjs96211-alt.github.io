window.WendaoContent={
 canon:'修仙AU，独立于无缺为盈和校园AU。当前是第一卷第九章结束后的学宫备考准备期；玩家扮演温无缺，家主非嫡出女儿，外界判断五行杂灵根，善符阵、机关、账目。不要在角色对话中揭晓混沌灵根，当前无人知道真相。温知遥比无缺年长三岁，两人没有血缘关系，是选择的家人，尚无确定恋爱安排；未成年阶段不得恋爱化或性化。知遥八岁被温家从温暖故宗带走，先天净水灵根，净灵殿强制抽取式净化耗损灵力和经脉；炉鼎仅指非性意味的灵力媒介，净水不创造灵气。知遥聪明温柔，有幽默、医药草木兴趣，爱桂花糕，善良不是苦难的产物。已发生：首次大比前知遥替无缺挡下温承璟攻击受伤；无缺首次喊姐姐；两人都未参赛；无缺秘密联系知遥父母并递出传召记录，父母被拒见，故宗遭任务调整与援防迟到挫伤；无缺自责时知遥说不是你的错，约三年后借学宫机会出去。当前两人练气三层，知遥有旧伤；正为第二次大比和学宫入门试长期准备。她也独立学医、研究、谋划，妹妹不能代替她作所有决定；爱意不随学习奖惩改变。未来规划不是已发生事件。温家未放人，尚无学籍、离家、学宫同窗或古妖师徒关系。当前不能提前告知混沌本源、后续雷劫和远期结局。',
 assets:[
 {id:'study-room',kind:'background',title:'竹窗书房',src:'./wendao/assets/study-room.webp',status:'ready'},
 {id:'sister-calm',kind:'portrait',title:'温知遥 · 温柔日常',src:'./wendao/assets/sister-calm.webp',status:'ready'},
 {id:'sister-tired',kind:'portrait',title:'温知遥 · 疲惫',src:'./wendao/assets/sister-tired.webp',status:'ready'},
 {id:'sister-concerned',kind:'portrait',title:'温知遥 · 忧心担忧',src:'./wendao/assets/sister-concerned.webp',status:'ready'},
 {id:'sister-relieved',kind:'portrait',title:'温知遥 · 欣慰浅笑',src:'./wendao/assets/sister-relieved.webp',status:'ready'},
 {id:'sister-ill',kind:'portrait',title:'温知遥 · 病中虚弱',src:'./wendao/assets/sister-ill.webp',status:'ready'},
 {id:'sister-weakened',kind:'portrait',title:'温知遥 · 受罚负伤',src:'./wendao/assets/sister-injured.webp',status:'ready'},
 {id:'lamp-study',kind:'cg',title:'灯下理书',src:'./wendao/assets/lamp-study.webp',status:'ready',chapter:'opening'},
 {id:'future-cg',kind:'cg',title:'未解锁',src:null,status:'pending',chapter:'canon-pending'}],
 chapters:[{id:'opening',title:'灯下问道',subtitle:'序章 · 准备期试读',description:'一盏灯，两份功课。交接包授权的起始场景；根据已确认准备期改编；不是原小说新增正文。',requires:{},start:'a',nodes:{
 a:{speaker:'旁白',text:'竹影映在窗纸上。案头的书尚未理齐，灯火却已为你留着。',background:'study-room',next:'b'},
 b:{speaker:'温知遥',text:'先把今日要读的放在手边。路还长，我们一卷一卷来。',portrait:'sister-calm',emotion:'calm',next:'c'},
 c:{speaker:'旁白',text:'她将散开的书页归拢，指尖在封面上停了一停。学宫入门试，是眼下可以争取的出口。',cg:'lamp-study',next:'d'},
 d:{speaker:'温知遥',text:'你有你的功课，我也有我的研习。不必一个人把所有事扛下。',portrait:'sister-calm',cg:null,next:'choice'},
 choice:{speaker:'妹妹',text:'灯芯轻轻一跳。你抬起头，对姐姐说——',options:[{id:'study',label:'“我先读这一卷。读完，我们一起商量。”',next:'study'},{id:'together',label:'“姐姐，你也说说自己的打算吧。”',next:'together'}]},
 study:{speaker:'温知遥',text:'好。我就在这里。等你读完，我们各自说说今日所得。',next:'end'},
 together:{speaker:'温知遥',text:'我想先查查有关灵根与净化的记载。你安心准备考试，我也会为自己找路。',next:'end'},
 end:{speaker:'旁白',text:'她翻开自己的书。两人的影子落在案上，隔着灯火，仍并肩向前。\n本章选择已保存；阅读不会冒充真实学习时长。',end:true}
 }},
 {id:'practice',title:'并肩研习',subtitle:'准备期 · 短章',description:'完成序章、累计30修为，且姐姐已有一次独立研习。演示支线，不改写后续主线。',requires:{previous:['opening'],xp:30,autonomy:1},start:'a',nodes:{a:{speaker:'旁白',text:'书页又翻过了一页。你们各自记下了今日所得。',background:'study-room',portrait:'sister-calm',next:'b'},b:{speaker:'温知遥',text:'我今日也读了一些。你的功课如何？我们交换着说一说。',next:'c'},c:{speaker:'旁白',text:'你们约定，下次仍各自带着新的收获来。',end:true}}},
 {id:'canon-pending',title:'后续主线',subtitle:'第二阶段编排',description:'原AU交接包已接入。后续主线尚未转成可运行章节，保持锁定。',pending:true,requires:{previous:['outline-approved']}}]
};
