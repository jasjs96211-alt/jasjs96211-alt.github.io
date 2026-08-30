"use client";

import { useMemo, useState } from "react";

type Section = "home" | "history" | "merch";
type Stage = "landing" | "setup" | "assign" | "brief" | "search" | "puzzle" | "ballot" | "result";
type RoleId = "lin" | "ye" | "chen" | "li" | "zhang";

type DeepClue = { title: string; detail: string; meaning: string };
type Role = {
  id: RoleId;
  name: string;
  title: string;
  sigil: string;
  color: string;
  publicBio: string;
  past: string;
  relationships: string[];
  arc: [string, string, string, string];
  opening: string;
  secret: string;
  items: string[];
  tasks: string[];
  deepClues: DeepClue[];
  prototype: string;
};

type Assignment = { player: string; pin: string; role: Role };
type SearchRecord = { investigator: string; target: Role; clueIndex: number; clue: DeepClue; isPublic: boolean };
type EvidenceRecord = { investigator: string; item: (typeof publicEvidence)[number]; isPublic: boolean };
type Ballot = { voter: RoleId; money: string; spy: RoleId; contact?: RoleId };

const roles: Role[] = [
  {
    id: "lin",
    name: "林振邦",
    title: "批局掌柜",
    sigil: "信",
    color: "#a63b2c",
    publicBio: "南洋归侨，经营海口埠振成批局。账目清楚，素以“批到钱到”立足。",
    past: "少年时随父做批脚，见过一位侨妇苦等丈夫的救命钱。父亲卖掉一亩薄田先行兑付，从此他认定：批局卖的不是脚程，是信用。接掌振成批局后，他宁可少赚，也不肯拖欠一封批。",
    relationships: ["李淑云替你核验银行账目，是你最信任的帮手。", "叶婉茹常来替侨眷代读家批，你知道她嘴严。", "陈阿水曾犯过错，但也曾冒死救回一袋侨批。"],
    arc: ["以守住批局声誉为一生准则", "秘密转款令自己成为最大嫌疑人", "在保全暗线与取得同伴信任之间抉择", "承认信用不仅是兑付银元，也是守住共同的山河"],
    opening: "银元由我经手，但我没有吞钱。若这局信誉毁了，往后每一封家书都会断在海上。",
    secret: "你受海外侨领托付，把两千银元转作抗战与救济经费，并先拿自己的田契垫付几户急等救命钱的侨眷。",
    items: ["写有“修祖屋”的两千元汇款单", "一本缺了一页的批局总账"],
    tasks: ["隐瞒款项用途，直到确认局内没有日谍", "找出地下交通员，并保护其身份", "让多数人相信批局没有侵吞侨汇"],
    deepClues: [
      { title: "三笔支出", detail: "夹层里藏着一张银行支出条：药品1200元、侨眷救济500元、转运与联络300元。三数相加恰为2000。", meaning: "钱没有落入个人口袋，但用途仍需与暗语互证。" },
      { title: "先垫后解", detail: "旧账写着：海路断绝时，林振邦曾以自家田契作保，先向侨眷兑付，待侨款抵达再平账。", meaning: "批局的信用不是口号，而是掌柜以家产承担风险。" },
    ],
    prototype: "人物为复合创作，守信垫款精神参考战时批局先行兑付侨款的真实事迹。",
  },
  {
    id: "ye",
    name: "叶婉茹",
    title: "侨眷联络人",
    sigil: "家",
    color: "#9b6433",
    publicBio: "丈夫远在南洋，常替街坊读批、写回批，也在批局帮忙照看侨眷。",
    past: "成婚三个月丈夫便下南洋。十余年里，两人的日子被一封封侨批接续。她从请人读信到替满街侨眷写信，渐渐明白：不能写在明面上的牵挂，也能藏在米价、雨水与家常话里。",
    relationships: ["林振邦让你在批局照看不识字的侨眷。", "陈阿水常替你带回丈夫的批，你熟悉他的说话习惯。", "你只在柜台见过张正洋两次，却觉得他的闽南话不像本地人。"],
    arc: ["只盼丈夫平安、家中无虞", "发现家书已经卷入比小家更大的风浪", "决定是否公开暗语并承担连累亲人的风险", "理解守护家书与守护家国原来是同一件事"],
    opening: "这封批写的是米价与祖屋，可我丈夫从不管米价。有人借家常话，说一件不能明说的事。",
    secret: "你协助地下网络传递暗语。缝在衣襟里的“方言乙本”能解释数字，但必须找到甲本才能完整解码。",
    items: ["夹有20银元的家批", "缝在衣襟里的方言乙本"],
    tasks: ["找到方言甲本，拼出完整密码", "不要过早暴露暗语规则", "确认海外亲人托付的钱真正用于救国与救人"],
    deepClues: [
      { title: "方言乙本", detail: "乙本写着：“涨三成”并非涨价，而是分三批；“三斗米”指三箱药品。", meaning: "家常话是躲过检查的密码。" },
      { title: "未寄出的回批", detail: "回批末尾写着：“钱若能救厝边，也能救山河。只盼你平安转来。”", meaning: "海外汇款连接的不只是小家，也是共同承受战争的人。" },
    ],
    prototype: "人物为复合创作，取材于闽南侨眷代读代写、以家书维系跨海家庭的真实生活。",
  },
  {
    id: "chen",
    name: "陈阿水",
    title: "水客",
    sigil: "路",
    color: "#256b68",
    publicBio: "往返厦门港、漳州角美与泉州安海的老水客，熟悉每一段小路与潮汐。",
    past: "年轻时靠替侨眷捎信谋生，曾因母亲重病私留30元，三个月后补齐，却从此背着“手脚不净”的闲话。后来一次海上封锁中，他折返火场抢回整袋侨批，仍没能洗去旧名声。",
    relationships: ["叶婉茹的丈夫多年托你送批，她能辨认你的记号。", "林振邦给过你第二次机会，却从未当面提那30元。", "李淑云每次都把你的脚费核得最细。"],
    arc: ["背着一次旧错，只求把每封批送到", "路线涂改与随身银元让旧污点重新裂开", "选择坦白羞耻的往事，或让猜疑继续扩大", "证明人的信用会受伤，也能够用一生重新挣回"],
    opening: "我身上有三十枚银元，也确实改过路线。但若我真卷款，今日就不会冒险回批局。",
    secret: "你是地下交通员。多年前你曾私留30元给重病母亲，后来已经补齐。今晚，那张本应锁在旧账匣里的收据竟出现在后门，背面还沾着你从未见过的硝粉——你不知道是谁动过它。",
    items: ["一张涂改过的厦漳泉转运图", "30枚银元与一张褪色收据"],
    tasks: ["找出日谍", "隐藏地下交通员身份", "证明30元是已补齐的旧账，不是失踪的2000元"],
    deepClues: [
      { title: "残批与方言甲本", detail: "烧焦的批纸写着：“旧屋漏水，阿水送三斗米往东厝。”甲本注明：旧屋漏水＝原路线危险；阿水＝联络人；东厝＝备用接收点。", meaning: "与叶婉茹的乙本合并，才能读出完整行动。" },
      { title: "三十元旧账", detail: "褪色收据证明陈阿水曾私留30元给重病母亲，三个月后已经补回；收据背面却沾上了新鲜硝粉。", meaning: "旧账发生在数年前，硝粉却是新的。污点是真的，但它与本次2000元缺口并不是同一件事。" },
    ],
    prototype: "人物为复合创作，取材于水客冒险穿越封锁线、兼送家书银信与情报的群体经历。",
  },
  {
    id: "li",
    name: "李淑云",
    title: "银行职员",
    sigil: "账",
    color: "#506b3f",
    publicBio: "负责核验侨汇与批局账目，谨慎寡言，能看懂每一枚印章的来路。",
    past: "父亲早逝后，她靠南洋舅父寄来的侨款读完商科学校。她知道一枚印章能救人，也能毁掉一个人的清白，因此总把账做得滴水不漏。战争却逼她第一次在正确的账上写下错误的用途。",
    relationships: ["林振邦是你的雇主，也替你保守过家庭秘密。", "你曾查出陈阿水的30元旧账，也亲手记下补齐日期。", "张正洋三日前来银行问过一笔没有具名的南洋来款。"],
    arc: ["相信规矩与凭证能够保护所有人", "为保护资金第一次伪造用途与印章", "必须判断何时说出程序上的罪、证明道义上的清白", "明白守法与守义在战争中可能留下艰难的夹缝"],
    opening: "银行总数与批局总账都没有错。错的是一张被改成“修祖屋”的用途单。",
    secret: "你借上司印章伪造用途，帮助林振邦避开敌伪检查。若事情败露，你会被视作内鬼。",
    items: ["“修祖屋”汇款单的银行副本", "一枚不应由你保管的上司印章"],
    tasks: ["隐藏伪造印章的经过", "帮助林振邦说明资金链", "查出谁在账目公开前就知道准确差额"],
    deepClues: [
      { title: "借来的印章", detail: "印泥和银行副本吻合。李淑云承认“修祖屋”是掩护，但坚称每一元都有真实去向。", meaning: "假用途不等于假账；它可能是战时保护资金的手段。" },
      { title: "提前打听总数的人", detail: "值班簿记着：自称南洋商人的张正洋，在封账前已准确问过“那两千元是否还在局里”。", meaning: "他知道尚未公开的数字，来意可疑。" },
    ],
    prototype: "人物为复合创作，代表在金融系统中掩护、转运与核验爱国款项的普通职员。",
  },
  {
    id: "zhang",
    name: "张正洋",
    title: "南洋商人",
    sigil: "影",
    color: "#383f4b",
    publicBio: "自称从马尼拉转道而来的布商，声称有一笔货款也被困在振成批局。",
    past: "他真正姓名无人知晓。多年训练教会他模仿口音、伪造商号，也教会他把人的羞耻和恐惧变成裂缝。他不在乎银元落进谁的口袋，只在乎这条民间汇路还能否继续运转。",
    relationships: ["你刻意接近林振邦，想知道批局为何迟迟不报官。", "你从旧档案中看到陈阿水的30元记录。", "你怀疑叶婉茹或陈阿水掌握着真正的交接方式。"],
    arc: ["以局外商人的姿态观察所有人", "利用每个人不愿公开的秘密制造猜疑", "在资金线与交通员之间选择首要目标", "即使身份败露，也可能以一个被出卖的名字截断汇路"],
    opening: "账上少钱就是少钱。别拿家国大义替掌柜遮掩，也许贼就在最熟悉路线的人当中。",
    secret: "你是日伪情报人员。你的目标不是偷走两千元，而是查出地下交通员、截断侨汇与抗战资金网络。",
    items: ["一块过重的怀表", "一张边角模糊的南洋商会证"],
    tasks: ["让众人误以为2000元被私吞", "把怀疑引向陈阿水", "在终局认出地下交通员"],
    deepClues: [
      { title: "怀表暗格", detail: "怀表夹层藏着微型相机与一段账页底片，底片拍摄时间早于公开对账。", meaning: "张正洋并非普通商人，他在秘密搜集资金链证据。" },
      { title: "硝粉与假证", detail: "袖口硝粉与残批烧痕一致；商会回函也证明证件编号属于另一名已故商人。", meaning: "他曾试图烧毁残批，并用假身份潜入批局。" },
    ],
    prototype: "人物为复合创作，代表战时封锁、监视和破坏侨批网络的敌伪力量。",
  },
];

const publicEvidence = [
  { id: "ledger", no: "01", title: "批局总账", tag: "钱从这里消失", detail: "八月廿一，南洋来款共5000银元；已向侨眷兑付3000银元。余下2000银元没有列入公开支出。账页边缘留有一道被刀片割下的痕迹。", question: "这2000元是被偷走，还是被藏进了另一套用途？" },
  { id: "slip", no: "02", title: "“修祖屋”汇款单", tag: "可疑用途", detail: "汇款人为南洋闽侨互助会，金额2000银元，用途写着“修祖屋”。但收款地址没有门牌，只有“东厝”二字。", question: "一群海外侨胞为何共同为一座没有地址的祖屋汇款？" },
  { id: "letter", no: "03", title: "叶家的侨批", tag: "不像家常话", detail: "批中写道：“南洋米价涨三成，旧屋漏水。托阿水送三斗米往东厝。”语气自然，内容却与叶家近况对不上。", question: "米价、漏水、阿水和东厝，分别指什么？" },
  { id: "map", no: "04", title: "涂改的转运图", tag: "厦漳泉暗线", detail: "原线由厦门港经角美转入内地，新墨水却把路线改向泉州安海一带，并标出三次分批交接。", question: "改线是为了卷款逃跑，还是避开封锁？" },
  { id: "bank", no: "05", title: "银行流水残页", tag: "三笔未命名支出", detail: "同日出现1200、500、300三笔支出，总数正好2000；收款栏被撕去，只留下药行、侨眷名册与脚费符号。", question: "三笔钱能否与侨批暗语互相印证？" },
  { id: "ash", no: "06", title: "烧焦的残批", tag: "有人想让它消失", detail: "批局后门发现半张烧焦侨批。门闩旁留有硝粉，灰烬中还有一小片异常清晰的账页底片。", question: "谁需要毁掉侨批，又是谁在秘密拍摄账目？" },
];

const financeOptions = [
  { id: "medicine", amount: 1200, label: "采购药品与三箱医疗物资" },
  { id: "relief", amount: 500, label: "救济战火中断汇的侨眷" },
  { id: "route", amount: 300, label: "分批转运、交通与联络费用" },
  { id: "house", amount: 800, label: "翻修林家祖屋" },
  { id: "debt", amount: 900, label: "偿还陈阿水赌债" },
  { id: "goods", amount: 1100, label: "购买张正洋的布匹" },
];

const cipherOptions = [
  { id: "correct", text: "原路线已危险；由陈阿水把三箱药品分三批送往备用接收点“东厝”。" },
  { id: "food", text: "米价上涨，祖屋漏雨，请陈阿水买三斗米送到东边厢房。" },
  { id: "escape", text: "陈阿水已卷款，应分三次逃往东南洋，所有人立即撤离。" },
];

const roleById = (id: RoleId) => roles.find((role) => role.id === id)!;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type YinxinFenghuoProps = {
  onExit?: () => void;
};

export default function YinxinFenghuo({ onExit }: YinxinFenghuoProps) {
  const [section, setSection] = useState<Section>("home");
  const [stage, setStage] = useState<Stage>("landing");
  const [playerNames, setPlayerNames] = useState(["", "", "", "", ""]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignIndex, setAssignIndex] = useState(0);
  const [roleOpen, setRoleOpen] = useState(false);
  const [evidenceTurn, setEvidenceTurn] = useState(0);
  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecord[]>([]);
  const [evidenceOpen, setEvidenceOpen] = useState<(typeof publicEvidence)[number] | null>(null);
  const [searchMode, setSearchMode] = useState<"public" | "deep">("public");
  const [searchTurn, setSearchTurn] = useState(0);
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [searchOpen, setSearchOpen] = useState<SearchRecord | null>(null);
  const [financeSelected, setFinanceSelected] = useState<string[]>([]);
  const [financeSolved, setFinanceSolved] = useState(false);
  const [financeFeedback, setFinanceFeedback] = useState("");
  const [cipherAnswer, setCipherAnswer] = useState("");
  const [cipherSolved, setCipherSolved] = useState(false);
  const [cipherFeedback, setCipherFeedback] = useState("");
  const [ballotIndex, setBallotIndex] = useState(0);
  const [ballotUnlocked, setBallotUnlocked] = useState(false);
  const [ballotPin, setBallotPin] = useState("");
  const [ballotMoney, setBallotMoney] = useState("");
  const [ballotSpy, setBallotSpy] = useState<RoleId | "">("");
  const [ballotContact, setBallotContact] = useState<RoleId | "">("");
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [dossier, setDossier] = useState<Role | null>(null);

  const currentAssignment = assignments[assignIndex];
  const currentEvidenceSearcher = assignments[evidenceTurn];
  const currentSearcher = assignments[searchTurn];
  const currentVoter = assignments[ballotIndex];

  const result = useMemo(() => {
    const moneyCorrect = ballots.filter((ballot) => ballot.money === "resistance").length >= 3;
    const counts = Object.fromEntries(roles.map((role) => [role.id, ballots.filter((ballot) => ballot.spy === role.id).length])) as Record<RoleId, number>;
    const highest = Math.max(0, ...Object.values(counts));
    const leaders = roles.filter((role) => counts[role.id] === highest);
    const spyFound = highest >= 2 && leaders.length === 1 && leaders[0].id === "zhang";
    const zhangBallot = ballots.find((ballot) => ballot.voter === "zhang");
    const contactExposed = zhangBallot?.contact === "chen";
    return { moneyCorrect, counts, spyFound, contactExposed };
  }, [ballots]);

  function beginAssignment() {
    const names = playerNames.map((name, index) => name.trim() || `玩家${index + 1}`);
    const roleOrder = shuffle(roles);
    setAssignments(names.map((player, index) => ({ player, role: roleOrder[index], pin: String(Math.floor(1000 + Math.random() * 9000)) })));
    setAssignIndex(0);
    setRoleOpen(false);
    setStage("assign");
  }

  function finishRole() {
    setRoleOpen(false);
    if (assignIndex === 4) setStage("brief");
    else setAssignIndex((value) => value + 1);
  }

  function inspectEvidence(item: (typeof publicEvidence)[number]) {
    if (!currentEvidenceSearcher || evidenceRecords.some((record) => record.item.id === item.id)) return;
    setEvidenceOpen(item);
  }

  function decideEvidence(isPublic: boolean) {
    if (!evidenceOpen || !currentEvidenceSearcher) return;
    setEvidenceRecords((items) => [...items, { investigator: currentEvidenceSearcher.player, item: evidenceOpen, isPublic }]);
    setEvidenceOpen(null);
    setEvidenceTurn((value) => value + 1);
  }

  function revealHeldEvidence(id: string) {
    setEvidenceRecords((items) => items.map((record) => record.item.id === id ? { ...record, isPublic: true } : record));
  }

  function investigate(target: Role) {
    if (!currentSearcher || target.id === currentSearcher.role.id) return;
    const clueIndex = searches.filter((item) => item.target.id === target.id).length;
    if (clueIndex >= 2) return;
    const record = { investigator: currentSearcher.player, target, clueIndex, clue: target.deepClues[clueIndex], isPublic: false };
    setSearches((items) => [...items, record]);
    setSearchOpen(record);
  }

  function closeSearch(isPublic: boolean) {
    setSearches((items) => items.map((item, index) => index === items.length - 1 ? { ...item, isPublic } : item));
    setSearchOpen(null);
    setSearchTurn((value) => value + 1);
  }

  function revealHeldSearch(index: number) {
    setSearches((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, isPublic: true } : item));
  }

  function checkFinance() {
    const correct = ["medicine", "relief", "route"];
    const solved = financeSelected.length === 3 && correct.every((id) => financeSelected.includes(id));
    setFinanceSolved(solved);
    setFinanceFeedback(solved ? "资金链闭合：1200 + 500 + 300 = 2000。现在还要用残批确认这三笔钱送往何处。" : "这组用途无法同时解释金额、银行符号和三批转运。请回看证据再试。" );
  }

  function checkCipher() {
    const solved = cipherAnswer === "correct";
    setCipherSolved(solved);
    setCipherFeedback(solved ? "暗语解开：家常话保护了真正的运送计划。你们已经回答“钱去了哪里”。" : "这项解释无法同时对应甲乙两本、路线图与三箱药品。" );
  }

  function unlockBallot() {
    if (currentVoter && ballotPin === currentVoter.pin) setBallotUnlocked(true);
  }

  function submitBallot() {
    if (!currentVoter || !ballotMoney || !ballotSpy) return;
    if (currentVoter.role.id === "zhang" && !ballotContact) return;
    const ballot: Ballot = { voter: currentVoter.role.id, money: ballotMoney, spy: ballotSpy as RoleId, contact: ballotContact ? ballotContact as RoleId : undefined };
    setBallots((items) => [...items, ballot]);
    setBallotUnlocked(false);
    setBallotPin("");
    setBallotMoney("");
    setBallotSpy("");
    setBallotContact("");
    if (ballotIndex === 4) setStage("result");
    else setBallotIndex((value) => value + 1);
  }

  function restart() {
    setStage("landing"); setSection("home"); setAssignments([]); setAssignIndex(0); setRoleOpen(false);
    setEvidenceTurn(0); setEvidenceRecords([]); setSearchMode("public"); setSearchTurn(0); setSearches([]); setEvidenceOpen(null); setSearchOpen(null);
    setFinanceSelected([]); setFinanceSolved(false); setFinanceFeedback(""); setCipherAnswer(""); setCipherSolved(false); setCipherFeedback("");
    setBallotIndex(0); setBallotUnlocked(false); setBallotPin(""); setBallotMoney(""); setBallotSpy(""); setBallotContact(""); setBallots([]);
  }

  if (stage !== "landing") {
    return (
      <main className="gameShell">
        <header className="gameNav"><button className="brandButton" onClick={restart}><span>银信</span>烽火</button><div className="gameGoal">唯一主线：找出2000银元去了哪里</div><div className="gameNavActions"><button className="textButton" onClick={restart}>退出本局</button>{onExit && <button className="portalReturn" onClick={onExit}>返回总站</button>}</div></header>

        {stage === "setup" && (
          <section className="setupPage pageEnter">
            <div className="eyebrow">开局准备 · 5人同屏传递</div>
            <h1>写下五位玩家的名字</h1>
            <p className="lead">系统会随机分配五个角色。请依次把设备交给对应玩家，查看角色时不要让其他人看到。</p>
            <div className="setupGrid">
              <div className="playerForm">
                {playerNames.map((name, index) => <label key={index}><span>玩家 {index + 1}</span><input value={name} maxLength={12} placeholder={`玩家${index + 1}`} onChange={(event) => setPlayerNames((items) => items.map((item, i) => i === index ? event.target.value : item))} /></label>)}
              </div>
              <aside className="ruleCard"><span className="bigNum">01</span><h3>先找钱，再找人</h3><p>所有人都要解释两千银元的去向；但五人中有一名日谍，会误导讨论并寻找地下交通员。</p><ul><li>序章：认识人物与案发经过</li><li>第一轮：私看证据，决定公开或保留</li><li>第二轮：调查角色，取得深层证据</li><li>终局：拼线索并秘密投票</li></ul></aside>
            </div>
            <button className="primary wide" onClick={beginAssignment}>随机分配角色</button>
          </section>
        )}

        {stage === "assign" && currentAssignment && (
          <section className="assignmentPage pageEnter">
            {!roleOpen ? <div className="sealedRole"><div className="seal">密</div><div className="eyebrow">请把设备交给</div><h1>{currentAssignment.player}</h1><p>确认四周无人观看后，再揭开角色。</p><button className="primary" onClick={() => setRoleOpen(true)}>只有我能看 · 揭开角色</button></div> :
            <article className="roleReveal" style={{ "--role": currentAssignment.role.color } as React.CSSProperties}>
              <div className="roleTop"><div className="roleSigil">{currentAssignment.role.sigil}</div><div><div className="eyebrow">{currentAssignment.player} 的秘密角色</div><h1>{currentAssignment.role.name}</h1><p>{currentAssignment.role.title}</p></div><div className="pinTag">投票密码 <strong>{currentAssignment.pin}</strong><small>请自己记住</small></div></div>
              <div className="rolePast"><span>你的前史</span><p>{currentAssignment.role.past}</p></div>
              <div className="secretBox"><span>只有你知道的今夜真相</span><p>{currentAssignment.role.secret}</p></div>
              <div className="roleColumns"><div><h3>随身物件</h3><ul>{currentAssignment.role.items.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>你与他人的关系</h3><ul>{currentAssignment.role.relationships.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
              <div className="arcCard"><h3>人物弧光 · 你要怎样演</h3><div>{["起点", "裂痕", "选择", "归宿"].map((label, index) => <span key={label}><small>{label}</small><b>{currentAssignment.role.arc[index]}</b></span>)}</div></div>
              <div className="taskCard"><h3>本局个人任务</h3><ol>{currentAssignment.role.tasks.map((item) => <li key={item}>{item}</li>)}</ol></div>
              <p className="roleAdvice">你可以隐瞒、回避或选择性公开系统给出的内容，但不能编造新证据。不要一次念完角色卡；让人物在追问和抉择中慢慢显露。</p>
              <button className="primary wide" onClick={finishRole}>我已记住 · 封存并传给下一位</button>
            </article>}
          </section>
        )}

        {stage === "brief" && (
          <section className="briefingPage pageEnter">
            <div className="briefingHero"><div><div className="eyebrow">完整故事序章 · 请一人朗读</div><h1>银信入夜</h1><p>1941年冬，战火把海路切成碎片。南洋寄来的家书和银元在封锁线外堆积，厦门港风声鹤唳，漳州内河换了暗哨，泉州沿海的水客只能趁夜转运。虚构的“海口埠”正处在三地汇路交会处，振成批局是附近侨眷最后还敢相信的一块招牌。</p></div><div className="caseStamp">序<br/>章</div></div>
            <div className="prologueText"><p>傍晚，林振邦收到南洋闽侨互助会汇来的<strong>5000银元</strong>。门外几十户侨眷等着救命钱，他依旧按旧例兑出3000元。入夜后警报骤响，众人封门避查；再开总账时，余下的<strong>2000元既不在钱柜，也没有公开支出名目</strong>。</p><p>偏偏这时，后门出现一封烧焦的残批。有人见过火光，有人改过路线，有人动用了不属于自己的印章，还有一名自称南洋商人的陌生人，似乎比所有人都更早知道“少了两千”。</p><p>外面的炮声越来越近。天亮前若不能说清钱款去向，批局将被查封，侨眷会认定汇款遭到侵吞；而真正等待这笔钱的人，也可能永远等不到它。</p></div>
            <div className="storyTimeline"><span><b>18:30</b>南洋来款5000元入账</span><span><b>19:10</b>向侨眷兑付3000元</span><span><b>20:05</b>警报响起，批局封门</span><span><b>21:00</b>发现2000元缺口与残批</span></div>
            <div className="objectiveStrip"><div><small>共同目标</small><strong>查清2000银元去了哪里</strong></div><div><small>隐藏威胁</small><strong>五人中有一名日谍</strong></div><div><small>注意</small><strong>有秘密，不等于有罪</strong></div></div>
            <div className="guideCard"><span>序章结束后做什么</span><ol><li>所有人一起阅读下面五张公开人物卡。</li><li>按页面顺序，每位玩家念出自己角色的“公开陈述”。</li><li>自由追问3分钟：昨晚你在哪里？你是否碰过钱、账、批或后门？</li></ol></div>
            <h2 className="chapterTitle">今夜在场的五个人</h2>
            <div className="publicCast">{assignments.map(({ player, role }) => <article key={role.id}><div className="openingName"><span style={{ background: role.color }}>{role.sigil}</span><div><b>{role.name}</b><small>{player} 饰 · {role.title}</small></div></div><p>{role.publicBio}</p><div className="publicRelation"><b>众人所知</b>{role.relationships[0]}</div><blockquote>“{role.opening}”</blockquote></article>)}</div>
            <div className="hostNote"><strong>讨论完成标志</strong><p>每个人都至少回答过一个问题，并提出自己目前最怀疑的一种钱款去向。完成后再进入搜证，不必现在指认日谍。</p></div>
            <button className="primary wide" onClick={() => setStage("search")}>进入第一轮 · 断汇疑云</button>
          </section>
        )}

        {stage === "search" && (
          <section className="gamePage pageEnter">
            <div className="progressRail"><span className={searchMode === "public" ? "active" : "done"}>Ⅰ 断汇疑云</span><span className={searchMode === "deep" ? "active" : ""}>Ⅱ 深度调查</span><span>Ⅲ 银路重构</span><span>Ⅳ 秘密投票</span></div>
            {searchMode === "public" ? <>
              <div className="roundHeader"><div><div className="eyebrow">第一轮 · 每人私查一件证物</div><h1>你发现的线索，由你决定是否公开</h1><p>五名玩家依次选择一件尚未被查的证物。查看时其他人请移开视线；读完后选择“公开”或“保留”。</p></div><div className="counter">{Math.min(evidenceTurn, 5)}<small>/ 5 次行动</small></div></div>
              <div className="objectiveBar"><b>主线问题</b><span>钱从哪一笔账消失，最后又变成了什么？</span></div>
              {evidenceTurn < 5 && currentEvidenceSearcher ? <div className="guideCard turnGuide"><span>现在轮到 {currentEvidenceSearcher.player}</span><ol><li>把设备交给他/她，其他玩家不要看屏幕。</li><li>从下方选择一件未调查证物并独自阅读。</li><li>当场决定公开或暂时保留，然后把设备交回桌面。</li></ol></div> : <div className="guideCard turnGuide complete"><span>第一轮已经结束</span><ol><li>持有私密证据的人可以描述、隐瞒，或点击公开。</li><li>所有人讨论3分钟，各说一种钱款去向假设。</li><li>讨论结束后进入深度调查。</li></ol></div>}
              <div className="evidenceGrid">{publicEvidence.map((item) => { const record = evidenceRecords.find((entry) => entry.item.id === item.id); return <button key={item.id} disabled={Boolean(record) || evidenceTurn >= 5} className={`evidenceCard ${record ? record.isPublic ? "published" : "held" : ""}`} onClick={() => inspectEvidence(item)}><span className="evidenceNo">证物 {item.no}</span><h3>{item.title}</h3><p>{record ? record.isPublic ? item.detail : `${record.investigator} 已调查，选择暂不公开` : item.tag}</p><small>{record ? record.isPublic ? `由 ${record.investigator} 公开` : "内容保密" : evidenceTurn < 5 ? "本轮可选择" : "本局未调查"}</small></button>; })}</div>
              {evidenceRecords.some((record) => !record.isPublic) && <div className="heldBoard"><h3>暂未公开的证据</h3><p>只有发现者知道内容。发现者若在讨论中决定公开，可点击对应按钮。</p>{evidenceRecords.filter((record) => !record.isPublic).map((record) => <button key={record.item.id} onClick={() => revealHeldEvidence(record.item.id)}><b>{record.investigator}</b><span>持有一条未公开证据</span><em>现在公开</em></button>)}</div>}
              {evidenceTurn >= 5 && <div className="roundFooter"><p>完成讨论后再继续。未公开不等于永远不能说，公开时机本身也是角色选择。</p><button className="primary" onClick={() => setSearchMode("deep")}>讨论完成 · 进入深度调查</button></div>}
            </> : <>
              <div className="roundHeader"><div><div className="eyebrow">第二轮 · 每人一次行动</div><h1>深度调查</h1><p>调查同一角色的第二次，会获得更深一层证据。每个角色最多被调查两次，不能调查自己。</p></div><div className="counter">{Math.min(searchTurn, 5)}<small>/ 5 次行动</small></div></div>
              {searchTurn < 5 && currentSearcher ? <><div className="searchTurnCard"><div><small>现在行动</small><h2>{currentSearcher.player}</h2><p>你是 <b>{currentSearcher.role.name}</b>。结合个人任务选择调查对象。</p></div><div className="turnSeal">查</div></div><div className="guideCard turnGuide"><span>这一回合怎么做</span><ol><li>其他人移开视线，由当前玩家选择调查对象。</li><li>首次调查得到第一层；第二次调查同一人得到深层证据。</li><li>读完后决定是否公开，再由下一位行动。</li></ol></div></> : <div className="searchTurnCard complete"><div><small>调查结束</small><h2>五次行动已完成</h2><p>请根据桌面上的公开证据与各自保留的信息，重构两千元资金链。</p></div><div className="turnSeal">合</div></div>}
              {searchTurn < 5 && currentSearcher && <div className="targetGrid">{roles.map((role) => { const count = searches.filter((item) => item.target.id === role.id).length; const disabled = role.id === currentSearcher.role.id || count >= 2; return <button key={role.id} disabled={disabled} className="targetCard" onClick={() => investigate(role)}><span style={{ background: role.color }}>{role.sigil}</span><div><b>{role.name}</b><small>{role.id === currentSearcher.role.id ? "不能调查自己" : count === 0 ? "首次调查" : count === 1 ? "可触发深层证据" : "已调查两次"}</small></div><em>{count}/2</em></button>; })}</div>}
              {searches.length > 0 && <div className="searchLog"><h3>深查记录</h3>{searches.map((record, index) => record.isPublic ? <button key={`${record.target.id}-${index}`} onClick={() => setSearchOpen(record)}><span>{index + 1}</span><div><b>{record.target.name} · {record.clue.title}</b><small>{record.investigator} 已公开 · 点击复看</small></div></button> : <button className="heldLog" key={`${record.target.id}-${index}`} onClick={() => revealHeldSearch(index)}><span>密</span><div><b>{record.investigator} 保留了一条调查结果</b><small>由发现者点击可公开</small></div></button>)}</div>}
              {searchTurn >= 5 && <div className="roundFooter"><p><b>下一步：</b>所有人先口头回答两题——2000元可能分成了哪几笔？谁最希望众人相信“钱被偷了”？</p><button className="primary" onClick={() => setStage("puzzle")}>讨论完成 · 进入银路重构</button></div>}
            </>}
          </section>
        )}

        {stage === "puzzle" && (
          <section className="puzzlePage pageEnter">
            <div className="progressRail"><span className="done">Ⅰ 断汇疑云</span><span className="done">Ⅱ 深度调查</span><span className="active">Ⅲ 银路重构</span><span>Ⅳ 秘密投票</span></div>
            <div className="roundHeader"><div><div className="eyebrow">第三轮 · 全员协作</div><h1>把钱与信放回同一条路</h1><p>先对清金额，再解开残批。两题都正确，才算真正回答“钱去了哪里”。</p></div></div>
            <div className="guideCard"><span>现在每个人做什么</span><ol><li>把设备放回桌面，所有人共同操作。</li><li>保留线索的玩家可以口述内容，也可以继续沉默。</li><li>先选三笔资金用途并核验，再合并甲乙本破解暗语；答错可以继续讨论。</li></ol></div>
            <article className={`puzzleCard ${financeSolved ? "solved" : ""}`}><div className="puzzleHead"><span>第一步</span><div><h2>两千银元如何分配？</h2><p>从六项中选出三项，使金额与证据全部吻合。</p></div></div><div className="optionGrid">{financeOptions.map((option) => <button key={option.id} disabled={financeSolved} className={financeSelected.includes(option.id) ? "selected" : ""} onClick={() => setFinanceSelected((items) => items.includes(option.id) ? items.filter((id) => id !== option.id) : items.length < 3 ? [...items, option.id] : items)}><b>{option.amount}元</b><span>{option.label}</span></button>)}</div><div className="answerRow"><strong>已选合计：{financeOptions.filter((option) => financeSelected.includes(option.id)).reduce((sum, option) => sum + option.amount, 0)}元</strong><button onClick={checkFinance} disabled={financeSolved || financeSelected.length !== 3}>核验资金链</button></div>{financeFeedback && <p className={`feedback ${financeSolved ? "good" : "bad"}`}>{financeFeedback}</p>}</article>
            <article className={`puzzleCard ${cipherSolved ? "solved" : ""}`}><div className="puzzleHead"><span>第二步</span><div><h2>“米价涨三成”到底说了什么？</h2><p>把叶婉茹的乙本、陈阿水的甲本与路线图合并。</p></div></div><div className="cipherQuote">“南洋米价涨三成，旧屋漏水。托阿水送三斗米往东厝。”</div><div className="radioStack">{cipherOptions.map((option) => <label key={option.id} className={cipherAnswer === option.id ? "selected" : ""}><input type="radio" name="cipher" value={option.id} disabled={cipherSolved} checked={cipherAnswer === option.id} onChange={() => setCipherAnswer(option.id)} /><span>{option.text}</span></label>)}</div><div className="answerRow"><span></span><button onClick={checkCipher} disabled={cipherSolved || !cipherAnswer}>提交解码</button></div>{cipherFeedback && <p className={`feedback ${cipherSolved ? "good" : "bad"}`}>{cipherFeedback}</p>}</article>
            {financeSolved && cipherSolved && <div className="roundFooter success"><p><b>主线已闭合：</b>钱被分为药品、侨眷救济和转运费用，正沿备用线路支援抗战。现在还要找出谁想截断这条路。</p><button className="primary" onClick={() => setStage("ballot")}>进入终局 · 五人秘密投票</button></div>}
          </section>
        )}

        {stage === "ballot" && currentVoter && (
          <section className="ballotPage pageEnter">
            <div className="progressRail"><span className="done">Ⅰ 断汇疑云</span><span className="done">Ⅱ 深度调查</span><span className="done">Ⅲ 银路重构</span><span className="active">Ⅳ 秘密投票</span></div>
            {!ballotUnlocked ? <div className="ballotSeal"><div className="seal">票</div><div className="eyebrow">第 {ballotIndex + 1} 张 / 共 5 张</div><h1>请把设备交给 {currentVoter.player}</h1><p><b>其他人移开视线。</b>当前玩家输入分角时记录的四位密码，独立回答钱款去向与破坏者身份；提交后再把设备传给页面指定的下一位。</p><div className="pinInput"><input inputMode="numeric" maxLength={4} value={ballotPin} placeholder="四位密码" onChange={(event) => setBallotPin(event.target.value.replace(/\D/g, ""))} /><button onClick={unlockBallot}>开启我的票</button></div>{ballotPin.length === 4 && ballotPin !== currentVoter.pin && <small className="pinError">密码不对，请回忆分角时的数字。</small>}</div> :
            <div className="ballotForm"><div className="eyebrow">{currentVoter.player} · {currentVoter.role.name} 的秘密判断</div><h1>封存你的答案</h1><fieldset><legend>1. 两千银元最终去了哪里？</legend><label><input type="radio" name="money" onChange={() => setBallotMoney("resistance")} checked={ballotMoney === "resistance"} />分作药品、侨眷救济与转运费，支援抗战</label><label><input type="radio" name="money" onChange={() => setBallotMoney("stolen")} checked={ballotMoney === "stolen"} />被批局或水客侵吞</label><label><input type="radio" name="money" onChange={() => setBallotMoney("private")} checked={ballotMoney === "private"} />用于林家修屋与私人周转</label></fieldset><fieldset><legend>2. 谁在破坏侨批与资金网络？</legend><div className="roleVoteGrid">{roles.map((role) => <label key={role.id} className={ballotSpy === role.id ? "selected" : ""}><input type="radio" name="spy" onChange={() => setBallotSpy(role.id)} checked={ballotSpy === role.id} /><span style={{ background: role.color }}>{role.sigil}</span><b>{role.name}</b></label>)}</div></fieldset>{currentVoter.role.id === "zhang" && <fieldset className="antagonistQuestion"><legend>日谍密令：谁是地下交通员？</legend><p>这是张正洋的专属胜负目标。</p><select value={ballotContact} onChange={(event) => setBallotContact(event.target.value as RoleId)}><option value="">请选择</option>{roles.filter((role) => role.id !== "zhang").map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></fieldset>}<button className="primary wide" disabled={!ballotMoney || !ballotSpy || (currentVoter.role.id === "zhang" && !ballotContact)} onClick={submitBallot}>封存此票 · 交给下一位</button></div>}
          </section>
        )}

        {stage === "result" && (
          <section className="resultPage pageEnter">
            <div className={`endingBanner ${result.moneyCorrect && result.spyFound && !result.contactExposed ? "win" : "mixed"}`}><div className="eyebrow">《银信烽火》终局</div><h1>{!result.moneyCorrect ? "断裂的汇路" : !result.spyFound ? "真相已明，破坏者逃脱" : result.contactExposed ? "代价中的胜利" : "银信未断"}</h1><p>{!result.moneyCorrect ? "众人仍把抗战款当成失窃，批局信用崩塌，海外侨胞与家乡之间的路被猜疑截断。" : !result.spyFound ? "你们找回了两千元的意义，却没有阻止潜伏者带走资金网络的线索。" : result.contactExposed ? "日谍被识破，资金也安全送达；但陈阿水的身份已经暴露，必须连夜转移。" : "资金真相与潜伏者同时被查明，陈阿水的身份也得到保护。那封跨海而来的家书，终于带着药与承诺穿过烽火。"}</p></div>
            <div className="verdictGrid"><article className={result.moneyCorrect ? "pass" : "fail"}><small>主线 · 钱去了哪里</small><h3>{result.moneyCorrect ? "多数判断正确" : "多数判断错误"}</h3><p>正确真相：1200元采购药品，500元救济断汇侨眷，300元用于分批转运与联络。</p></article><article className={result.spyFound ? "pass" : "fail"}><small>支线 · 谁在破坏汇路</small><h3>{result.spyFound ? "张正洋被识破" : "潜伏者未被锁定"}</h3><p>{roles.map((role) => `${role.name} ${result.counts[role.id]}票`).join(" · ")}</p></article><article className={!result.contactExposed ? "pass" : "fail"}><small>暗线 · 交通员是否安全</small><h3>{result.contactExposed ? "陈阿水身份暴露" : "陈阿水得到保护"}</h3><p>张正洋{result.contactExposed ? "准确识别了" : "没有识别出"}地下交通员。</p></article></div>
            <article className="truthCard"><div><div className="eyebrow">完整复盘</div><h2>没有凶手，仍然有人作恶</h2></div><p>林振邦与李淑云把两千元伪装成“修祖屋”，叶婉茹用家常话加密，陈阿水改走厦漳泉备用线路。张正洋潜入批局，偷拍账目、焚烧残批，并利用陈阿水的旧错制造“水客卷款”假象。他真正要摧毁的，是侨批赖以运转的信任。</p><blockquote>“钱若能救厝边，也能救山河。”</blockquote></article>
            <article className="educationCard"><div className="bigSeal">义</div><div><div className="eyebrow">主题落点</div><h2>一封批，连着小家，也连着山河</h2><p>侨批既是家书，也是汇款凭证，更是一条以信用维系的跨国民间网络。战时，批局以家产垫款守住承诺，海外侨胞挪出血汗钱支援抗战，水客冒险护送——战争的残酷，恰恰让这种海内外同胞的羁绊更清楚。</p><button className="textButton" onClick={() => setSection("history")}>查看真人真事原型</button></div></article>
            <div className="roleReview"><h2>角色秘密公开</h2><div>{roles.map((role) => <button key={role.id} onClick={() => setDossier(role)}><span style={{ background: role.color }}>{role.sigil}</span><b>{role.name}</b><small>查看原型与完整任务</small></button>)}</div></div>
            <div className="resultActions"><button className="secondary" onClick={() => { restart(); setSection("history"); }}>回到原型档案</button><button className="primary" onClick={restart}>重新开一局</button></div>
          </section>
        )}

        {evidenceOpen && <div className="modalBackdrop"><article className="evidenceModal"><div className="privateBanner">仅 {currentEvidenceSearcher?.player} 阅读 · 其他玩家请勿观看</div><div className="evidenceNo">证物 {evidenceOpen.no}</div><h2>{evidenceOpen.title}</h2><div className="paperEvidence">{evidenceOpen.detail}</div><div className="questionBox"><b>现在要问</b><p>{evidenceOpen.question}</p></div><div className="decisionBox"><b>你准备怎样处理？</b><p>公开后会显示在所有人的线索板；保留后只显示“你持有一条秘密证据”，稍后仍可改为公开。</p><div><button className="secondary" onClick={() => decideEvidence(false)}>暂不公开</button><button className="primary" onClick={() => decideEvidence(true)}>立即公开</button></div></div></article></div>}
        {searchOpen && <div className="modalBackdrop"><article className="evidenceModal deepModal"><div className="privateBanner">{searchOpen.isPublic ? "公开证据复看" : `仅 ${searchOpen.investigator} 阅读 · 其他玩家请勿观看`}</div><div className="roleSigil" style={{ background: searchOpen.target.color }}>{searchOpen.target.sigil}</div><div className="eyebrow">第 {searchOpen.clueIndex + 1} 层 · {searchOpen.target.name}</div><h2>{searchOpen.clue.title}</h2><div className="paperEvidence">{searchOpen.clue.detail}</div><div className="questionBox"><b>这说明</b><p>{searchOpen.clue.meaning}</p></div>{searchOpen.isPublic ? <button className="primary wide" onClick={() => setSearchOpen(null)}>关闭复看</button> : <div className="decisionBox"><b>你准备怎样处理？</b><p>你的选择会影响桌面上所有人能看见的信息。</p><div><button className="secondary" onClick={() => closeSearch(false)}>暂不公开</button><button className="primary" onClick={() => closeSearch(true)}>立即公开</button></div></div>}</article></div>}
        {dossier && <div className="modalBackdrop" onClick={() => setDossier(null)}><article className="evidenceModal dossier" onClick={(event) => event.stopPropagation()}><button className="modalClose" onClick={() => setDossier(null)}>×</button><div className="roleSigil" style={{ background: dossier.color }}>{dossier.sigil}</div><div className="eyebrow">{dossier.title}</div><h2>{dossier.name}</h2><h3>前史</h3><p>{dossier.past}</p><h3>今夜真相</h3><p>{dossier.secret}</p><h3>人物弧光</h3><ol>{dossier.arc.map((beat, index) => <li key={beat}><b>{["起点", "裂痕", "选择", "归宿"][index]}：</b>{beat}</li>)}</ol><h3>个人任务</h3><ol>{dossier.tasks.map((task) => <li key={task}>{task}</li>)}</ol><h3>创作原型</h3><p>{dossier.prototype}</p></article></div>}
      </main>
    );
  }

  return (
    <main>
      <header className="topbar"><button className="brandButton" onClick={() => setSection("home")}><span>银信</span>烽火</button><span className="betaBadge">BETA 测试版</span><nav>{([['home','进入故事'],['history','史实原型'],['merch','IP与文创']] as [Section,string][]).map(([id,label]) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}>{label}</button>)}</nav>{onExit && <button className="portalReturn" onClick={onExit}>返回总站</button>}<button className="miniStart" onClick={() => setStage("setup")}>五人开局</button></header>
      {section === "home" && <>
        <section className="hero pageEnter"><div className="heroCopy"><div className="eyebrow">BETA · 侨批文化五人阵营推理</div><h1>两千银元<br/><em>去了哪里？</em></h1><p>1941年，厦漳泉侨批汇路濒临断绝。一笔南洋来款从账上消失，五名在场者各怀秘密——其中一人正想摧毁这条跨海的信义之路。</p><div className="betaNotice"><b>公开测试说明</b><span>本版本用于课程展示与玩家测试；故事、角色和证据仍会根据反馈继续修订。</span></div><div className="heroActions"><button className="primary" onClick={() => setStage("setup")}>开始《银信烽火》</button><button className="secondary" onClick={() => setSection("history")}>先看史实原型</button></div><div className="quickFacts"><span>5人</span><i></i><span>约60—90分钟</span><i></i><span>无凶杀案</span><i></i><span>一台设备即可</span></div></div><aside className="caseCard"><div className="caseTop"><span>振成批局 · 密卷</span><b>1941</b></div><div className="missingAmount"><small>账面缺口</small><strong>银元 2,000</strong></div><div className="redThread"><span>5000到款</span><b>→</b><span>3000兑付</span><b>→</b><span className="unknown">去向不明</span></div><p>“修祖屋”真是修屋吗？<br/>“米价涨三成”又是谁的暗号？</p><div className="caseSeal">查</div></aside></section>
        <section className="objectiveSection"><div><small>这一次，只抓住一条主线</small><h2>先找钱，再找人</h2></div><p>每件证据都服务于同一个问题：两千银元去了哪里。等资金链闭合后，你们才需要判断——谁在故意让大家相信“钱被偷了”？</p></section>
        <section className="stepsSection"><div className="sectionHead"><div className="eyebrow">完整可玩流程</div><h2>四轮，完成一场真正的推理</h2></div><div className="stepsGrid"><article><span>01</span><h3>断汇疑云</h3><p>五人依次私查证物，并决定公开或保留。</p></article><article><span>02</span><h3>深度调查</h3><p>轮流调查角色；重复调查同一角色会触发深层证据。</p></article><article><span>03</span><h3>银路重构</h3><p>亲手拼出1200、500、300三笔用途，并破解方言暗语。</p></article><article><span>04</span><h3>秘密投票</h3><p>每人用密码独立作答：钱去了哪里，谁在破坏汇路。</p></article></div></section>
        <section className="darkSection"><div><div className="eyebrow">不是找凶手</div><h2>有坏人，也有比“抓坏人”更重要的事</h2></div><p>日谍的目标是截断侨汇网络；守局者的目标是让钱、信与人都抵达。胜负不只看有没有找出潜伏者，还看你们是否守住了交通员，以及是否理解批局为何甘愿以自己的钱垫付侨款。</p></section>
      </>}

      {section === "history" && <section className="contentSection pageEnter"><div className="contentHero"><div><div className="eyebrow">真人真事 · 复合改编</div><h1>故事是虚构的，<br/>信义与烽火都是真的。</h1></div><p>《银信烽火》不直接套用某一个人的生平，而是把闽南侨批史中的真实制度、人物精神与抗战行动，重组为一场可推理的案件。</p></div><div className="historyGrid"><article><span>1880</span><h3>郭有品与天一信局</h3><p>漳州龙溪人郭有品在菲律宾创办天一信局，逐步形成跨越南洋与闽南的侨批网络。它让“家书＋汇款”依靠信誉穿过海洋。</p></article><article><span>战时</span><h3>批局垫款守信</h3><p>海路阻断、侨款迟滞时，批局仍要面对等钱度日的侨眷。先行垫付、以家产承担风险，是“批到钱到”最沉重的实践。</p></article><article><span>1938</span><h3>侨批中的抗战捐款</h3><p>项目资料记录了苏俊谦、郭子纲、黄奕等人通过侨批寄出200元，捐助抗大。海外谋生所得由家用延伸为救亡力量。</p></article><article><span>厦·漳·泉</span><h3>一条复合汇路</h3><p>游戏中的海口埠为虚构地点，路线融合厦门港、漳州角美与泉州安海等侨批节点，让三地文化在同一案件中相遇。</p></article></div><div className="methodNote"><b>创作边界</b><p>郭有品与天一信局作为历史原型出现，不被虚构成游戏中的日谍或涉案者；五名玩家角色均为复合人物。结局传达的是：侨批网络凭信用而生，也在战争中承担了家国责任。</p></div><button className="primary" onClick={() => setStage("setup")}>带着史实进入游戏</button></section>}

      {section === "merch" && <section className="contentSection pageEnter"><div className="contentHero"><div><div className="eyebrow">原创IP与文创概念</div><h1>把一封会走路的信，<br/>带回今天。</h1></div><p>视觉系统以“信、汇、路、印”为核心：米白批纸承载家书，朱红印章代表信用，海路靛蓝连接厦漳泉与南洋，飞燕象征跨海传信。</p></div><div className="visualShowcase"><article><figure><img src="/tidal-twin-seals-concept.webp" alt="侨批主题推理盒、卡牌、印章、路线图与文创产品概念图"/><figcaption>实体推理盒与文创组合概念效果图</figcaption></figure><div><div className="eyebrow">设计成果 01</div><h2>“双印潮路”实体体验系统</h2><p>画面将推理盒、证物卡、旧批笺、路线图、双印冰箱贴与飞燕徽章放在同一张桌面上，模拟玩家拆盒后的完整体验。墨绿取自夜色与海路，旧纸米色对应侨批档案，朱红双印强调侨批既是家书、也是汇款凭证的双重属性。</p><h3>可用于</h3><ul><li><b>剧本杀实体盒：</b>包装、角色卡、线索卡和路线板的整体视觉参考。</li><li><b>展览展示：</b>作为项目成果海报或文创产品组合效果图。</li><li><b>衍生开发：</b>双印冰箱贴、飞燕徽章、邮票贴纸与侨批明信片。</li></ul><small>注：图片中的英文名称与“Six Players”为早期概念文字，正式打样将统一为《银信烽火》五人版。</small></div></article><article className="reverse"><figure><img src="/a-pi-character-sheet.webp" alt="侨批IP角色阿批的正面、侧面、背面、动作与表情设计稿"/><figcaption>“阿批”三视图、动作与表情设定</figcaption></figure><div><div className="eyebrow">设计成果 02</div><h2>阿批 · 把托付送到的跨海信使</h2><p>阿批以信封为身体，胸前朱红批印象征“有凭有信”；脚边海浪代表跨洋汇路，棕色邮差包对应水客送批，伴飞的燕子则连接南洋与闽南。圆润轮廓降低历史题材的距离感，同时保留旧纸纹理与闽南海洋气质。</p><h3>可用于</h3><ul><li><b>游戏引导：</b>担任网页提示角色、规则讲解员与线索确认图标。</li><li><b>传播素材：</b>制作表情包、公众号插图、短视频贴纸和动态片头。</li><li><b>文创产品：</b>亚克力立牌、冰箱贴、帆布袋、徽章与研学任务卡。</li></ul><div className="colorChips"><span>批纸米白</span><span>印泥朱红</span><span>海路靛蓝</span><span>邮差棕</span></div></div></article></div><div className="productGrid"><article><div className="productVisual magnet"><span>修<br/>祖<br/>屋</span><i>密</i></div><h3>暗语冰箱贴套组</h3><p>“修祖屋”“米价涨三成”“东厝”三枚磁吸件，组合后显出隐藏译文。</p><small>用途：互动解谜、纪念品</small></article><article><div className="productVisual stampSet"><span>厦</span><span>漳</span><span>泉</span></div><h3>厦漳泉路线印章</h3><p>三枚节点章配一张折叠航路卡，盖章即可复现侨批转运。</p><small>用途：研学任务、场馆打卡</small></article><article><div className="productVisual boxMock"><b>银信<br/>烽火</b><span>五人推理盒</span></div><h3>实体推理盒</h3><p>角色册、残批、账页、暗语双本、怀表线索与主持说明可完整装盒。</p><small>用途：课程实践、项目展示</small></article></div></section>}
    </main>
  );
}
