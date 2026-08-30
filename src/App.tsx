import { useEffect, useMemo, useRef, useState, type AnchorHTMLAttributes } from "react";
import { Icon } from "./components/Icon";
import { contentTypeLabels, publicContent, searchableText, type ArchiveIndexRecord, type ContentEntry, type ContentType } from "./content";
import YinxinFenghuo from "./features/yinxin/YinxinFenghuo";

type Navigate = (path: string) => void;

const navItems = [
  ["/learn", "认识侨批"],
  ["/archives", "侨批档案"],
  ["/fieldwork", "实践足迹"],
  ["/research", "研究成果"],
  ["/media", "影像档案"],
  ["/creative", "文创实验室"],
] as const;

const pageIntros: Partial<Record<ContentType, { eyebrow: string; title: string; lead: string }>> = {
  learn: {
    eyebrow: "Learn · 面向每一位访客",
    title: "从“批”字开始，认识一条跨海的生活网络",
    lead: "侨批既是家书，也是汇款凭证。这里从词义、流转、信用与保护四个角度，建立进入侨批世界的第一层知识。",
  },
  fieldwork: {
    eyebrow: "Fieldwork · 以脚步进入档案",
    title: "厦门、泉州、漳州：我们如何在现场理解侨批",
    lead: "场馆观察、访谈、档案工作与校园课程共同构成实践路径，每条记录都注明团队实际到访的采集地点。",
  },
  research: {
    eyebrow: "Research · 项目与方法",
    title: "让每一条结论，都知道自己从哪里来",
    lead: "项目简介、研究方法与阶段性文献综述在这里形成可追溯的研究脉络；申报原件中的个人信息不会进入公共页面。",
  },
  media: {
    eyebrow: "Media · 影像与传播记录",
    title: "当一封旧信进入今天的屏幕",
    lead: "这里整理团队短视频、调研影像和公共传播成果，并逐项注明作品规格、公开入口与成果依据。",
  },
};

function normalizeHash() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function useHashRoute(): [string, Navigate] {
  const [path, setPath] = useState(normalizeHash);
  useEffect(() => {
    const onHashChange = () => setPath(normalizeHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const navigate: Navigate = (next) => {
    const normalized = next.startsWith("/") ? next : `/${next}`;
    if (normalizeHash() === normalized) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.location.hash = normalized;
  };
  return [path, navigate];
}

function entryPath(entry: ContentEntry) {
  return `/${entry.type}/${entry.slug}`;
}

function SiteLink({ to, children, ...props }: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return <a href={`#${to}`} {...props}>{children}</a>;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function VerificationBadge({ entry }: { entry: ContentEntry }) {
  return <span className={`verificationBadge ${entry.verification}`}>{entry.verification === "verified" ? "来源已核对" : "资料整理中"}</span>;
}

function PortalHeader({ path, menuOpen, setMenuOpen }: { path: string; menuOpen: boolean; setMenuOpen: (value: boolean) => void }) {
  return (
    <header className="portalHeader">
      <div className="portalHeaderInner">
        <SiteLink to="/" className="portalBrand" onClick={() => setMenuOpen(false)}>
          <span className="portalBrandSeal">批</span>
          <span><b>纸短情长</b><small>侨批文化数字展陈与研究平台</small></span>
        </SiteLink>
        <nav className={menuOpen ? "portalNav open" : "portalNav"} aria-label="主导航">
          {navItems.map(([href, label]) => (
            <SiteLink key={href} to={href} className={path === href || path.startsWith(`${href}/`) ? "active" : ""} aria-current={path === href || path.startsWith(`${href}/`) ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}</SiteLink>
          ))}
        </nav>
        <div className="portalTools">
          <SiteLink to="/search" className="iconButton" aria-label="全站搜索"><Icon name="search" size={19}/></SiteLink>
          <button className="menuButton" type="button" aria-label={menuOpen ? "关闭导航" : "打开导航"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? "close" : "menu"} size={21}/>
          </button>
        </div>
      </div>
    </header>
  );
}

function PortalFooter() {
  return (
    <footer className="portalFooter">
      <div className="footerBrand">
        <span className="portalBrandSeal">批</span>
        <div><b>纸短情长</b><p>从一纸家书，到跨越山海的家国记忆。</p></div>
      </div>
      <div className="footerLinks">
        <div><b>浏览</b><SiteLink to="/learn">认识侨批</SiteLink><SiteLink to="/archives">侨批档案</SiteLink><SiteLink to="/routes">侨路地图</SiteLink><SiteLink to="/timeline">时间轴</SiteLink></div>
        <div><b>项目</b><SiteLink to="/fieldwork">实践足迹</SiteLink><SiteLink to="/research">研究成果</SiteLink><SiteLink to="/media">影像档案</SiteLink><SiteLink to="/creative">文创实验室</SiteLink></div>
        <div><b>参观指南</b><span>按场馆浏览资料</span><span>按主题认识侨批</span><span>查看团队实践成果</span><span>体验青年文创项目</span></div>
      </div>
      <div className="footerBottom"><span>侨批文化数字展陈与研究平台</span><span>研究、展陈与青年文创并行</span></div>
    </footer>
  );
}

function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="面包屑">
      <SiteLink to="/">首页</SiteLink>
      {items.map((item) => <span key={`${item.label}-${item.to ?? "current"}`}><Icon name="chevron" size={13}/>{item.to ? <SiteLink to={item.to}>{item.label}</SiteLink> : <em>{item.label}</em>}</span>)}
    </nav>
  );
}

function ContentCard({ entry, featured = false }: { entry: ContentEntry; featured?: boolean }) {
  return (
    <article className={`contentCard ${featured ? "featured" : ""}`}>
      {entry.cover ? <div className="contentCardImage"><img src={entry.cover} alt={entry.coverAlt ?? ""} loading="lazy" decoding="async"/></div> : <div className={`contentCardGraphic type-${entry.type}`}><Icon name={entry.type === "fieldwork" ? "fieldwork" : entry.type === "research" ? "research" : entry.type === "media" ? "media" : entry.type === "creative" ? "creative" : "learn"} size={30}/><span>{contentTypeLabels[entry.type]}</span></div>}
      <div className="contentCardBody">
        <div className="cardMeta"><span>{entry.dateLabel ?? contentTypeLabels[entry.type]}</span><VerificationBadge entry={entry}/></div>
        <h3><SiteLink to={entryPath(entry)}>{entry.title}</SiteLink></h3>
        <p>{entry.summary}</p>
        <div className="tagRow">{entry.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <SiteLink to={entryPath(entry)} className="cardLink">查看条目 <Icon name="arrow" size={17}/></SiteLink>
      </div>
    </article>
  );
}

function HomePage() {
  const fieldwork = publicContent.filter((entry) => entry.type === "fieldwork");
  const research = publicContent.filter((entry) => entry.type === "research");
  const archiveIndex = publicContent.find((entry) => entry.slug === "qiaopi-index-v1");
  const archiveTotal = archiveIndex?.archiveStats?.total ?? 0;
  const selected = [
    fieldwork.find((entry) => entry.slug === "haicang-archives"),
    research.find((entry) => entry.slug === "project-overview"),
    publicContent.find((entry) => entry.slug === "yinxin-fenghuo"),
  ].filter(Boolean) as ContentEntry[];

  return (
    <>
      <section className="portalHero">
        <div className="heroRouteLine" aria-hidden="true"></div>
        <div className="portalHeroCopy">
          <div className="kicker"><span>数字资料库</span><i></i><span>研究与田野</span><i></i><span>青年文创</span></div>
          <h1><span>纸短情长</span>侨批文化数字展陈<br/>与研究平台</h1>
          <p>一封家书，一笔汇款，一条由信用维系的跨海之路。我们把散落在调研报告、场馆记录与青年创作中的材料重新编目，让侨批被看见，也能继续被研究。</p>
          <div className="portalHeroActions"><SiteLink to="/learn" className="portalPrimary">从一封侨批开始 <Icon name="arrow" size={18}/></SiteLink><SiteLink to="/archives" className="portalSecondary">浏览档案结构</SiteLink></div>
          <div className="heroAssurance"><Icon name="shield" size={18}/><span>本平台内容均注明采集场馆与整理依据。</span></div>
        </div>
        <div className="letterExhibit" aria-label="侨批跨海传递概念示意">
          <div className="exhibitLabel">一纸两端 · 概念示意</div>
          <div className="letterPaper">
            <span className="letterDate">家书 · 汇款凭证</span>
            <strong>见字如晤</strong>
            <p>纸面保存的是家常话，背后连接的是迁移、劳作、家庭与侨乡。</p>
            <div className="letterLines"><i></i><i></i><i></i><i></i></div>
            <span className="letterSeal">信</span>
          </div>
          <div className="routeCaption"><span>南洋侨居地</span><i></i><b>跨海</b><i></i><span>厦 · 漳 · 泉</span></div>
        </div>
      </section>

      <section className="dataBand" aria-label="项目数据概览">
        <div><strong>3</strong><span>座闽南城市<br/><small>厦门 · 泉州 · 漳州</small></span></div>
        <div><strong>6</strong><span>处文化现场<br/><small>五处场馆＋天一信局旧址</small></span></div>
        <div><strong>4</strong><span>类研究方法<br/><small>实地 · 访谈 · 行动 · 文献</small></span></div>
        <div><strong>{archiveTotal}</strong><span>条图像资料索引<br/><small>来自泉州两处场馆</small></span></div>
        <div><strong>1</strong><span>项完整互动成果<br/><small>《银信烽火》在线体验</small></span></div>
      </section>

      <section className="portalSection introSection">
        <div className="sectionLabel"><span>01</span><b>认识侨批</b></div>
        <div className="introQuestion"><h2>“批”，究竟是什么意思？</h2><p>在闽南语语境中，“批”有“信”的意思。侨批把书信与款项放在同一次跨海传递中：它既是家庭通信，也是民间金融凭证，更是华侨迁移与侨乡生活留下的原始记录。</p><SiteLink to="/learn" className="underLink">进入科普专题 <Icon name="arrow" size={17}/></SiteLink></div>
        <div className="definitionStack"><article><small>01 · 信</small><b>家常、嘱托与思念</b><p>写给父母、妻儿与族人的近况，也记录家庭生活的细部。</p></article><article><small>02 · 款</small><b>谋生所得与家庭支持</b><p>汇款金额、用途和流转痕迹，保留民间信用网络的证据。</p></article><article><small>03 · 路</small><b>水客、批局与递送者</b><p>一封批由多人接力，穿过海外侨居地与中国侨乡。</p></article></div>
      </section>

      <section className="portalSection moduleSection">
        <div className="sectionHeading"><div><span className="overline">EXPLORE THE COLLECTION</span><h2>从资料，到人、地方与时代</h2></div><p>场馆调研、侨批知识与项目成果在这里按主题重新组织，访客可以检索、筛选并继续深入阅读。</p></div>
        <div className="moduleGrid">
          <SiteLink to="/archives" className="moduleCard large"><Icon name="archive" size={28}/><span>02</span><h3>侨批档案库</h3><p>从泉州华侨历史博物馆与泉州侨批馆的 68 条图像资料开始，按场馆、类别与主题浏览。</p><b>浏览资料索引 <Icon name="arrow" size={17}/></b></SiteLink>
          <SiteLink to="/fieldwork" className="moduleCard"><Icon name="fieldwork" size={26}/><span>03</span><h3>实践足迹</h3><p>六处文化现场与校园课程的图文记录。</p></SiteLink>
          <SiteLink to="/research" className="moduleCard"><Icon name="research" size={26}/><span>04</span><h3>研究成果</h3><p>项目问题、方法、报告与文献脉络。</p></SiteLink>
          <SiteLink to="/routes" className="moduleCard"><Icon name="map" size={26}/><span>05</span><h3>侨路地图</h3><p>先呈现调研节点，逐步关联真实档案路径。</p></SiteLink>
          <SiteLink to="/timeline" className="moduleCard"><Icon name="timeline" size={26}/><span>06</span><h3>双轨时间轴</h3><p>侨批历史与我们的研究历程彼此对照。</p></SiteLink>
          <SiteLink to="/media" className="moduleCard"><Icon name="media" size={26}/><span>07</span><h3>影像档案</h3><p>观看团队短视频，浏览调研图像与传播成果。</p></SiteLink>
        </div>
      </section>

      <section className="routeStory">
        <div className="routeStoryCopy"><span className="overline light">A LETTER ACROSS THE SEA</span><h2>一封侨批，如何跨越山海</h2><p>从海外谋生者写下家书，到国内亲人收批回批，沿途的每一次经手都建立在责任与信用之上。</p><SiteLink to="/routes" className="lightLink">打开侨路地图 <Icon name="arrow" size={18}/></SiteLink></div>
        <div className="routeSteps"><article><span>01</span><b>写批与托付</b><p>家书与款项一并交给可信的经手者。</p></article><article><span>02</span><b>跨海转运</b><p>水客、商号与批局在不同节点接力。</p></article><article><span>03</span><b>侨乡递送</b><p>批脚把银信送到家门，并留下流转凭证。</p></article><article><span>04</span><b>回批确认</b><p>收到与回信，让跨海关系继续运转。</p></article></div>
      </section>

      <section className="portalSection selectedSection">
        <div className="sectionHeading"><div><span className="overline">SELECTED RECORDS</span><h2>首批整理成果</h2></div><SiteLink to="/search" className="underLink">搜索全部公开内容 <Icon name="search" size={16}/></SiteLink></div>
        <div className="selectedGrid">{selected.map((entry, index) => <ContentCard key={entry.id} entry={entry} featured={index === 2}/>)}</div>
      </section>

      <section className="projectJourney">
        <div className="journeyVisual" aria-label="项目在厦门、泉州与漳州的实践图像">
          <img src="/fieldwork-haicang.webp" alt="团队实践路线中的厦门市海沧区档案馆" loading="lazy" decoding="async"/>
          <img src="/fieldwork-quanzhou-qiaopi.webp" alt="团队实践路线中的泉州侨批馆" loading="lazy" decoding="async"/>
          <img src="/fieldwork-yuegang.webp" alt="团队实践路线中的漳州月港海丝馆" loading="lazy" decoding="async"/>
          <span>厦门 · 泉州 · 漳州<br/><b>从现场出发，把成果留在网上</b></span>
        </div>
        <div className="journeyCopy">
          <span className="overline">OUR PATH · 项目历程</span>
          <h2>这个网站，也在记录我们如何走近侨批</h2>
          <p>它不是一次性展板，而是一份会继续生长的项目档案：现场观察、研究写作、影像传播与互动创作，都在这里留下可追溯的位置。</p>
          <ol className="journeySteps">
            <li><span>01</span><div><b>走进文化现场</b><small>完成厦漳泉五处场馆调研，并补充天一信局旧址的历史资料。</small></div></li>
            <li><span>02</span><div><b>整理图像与研究材料</b><small>把分散的报告、场馆记录与 68 张采集图像重新编目。</small></div></li>
            <li><span>03</span><div><b>转化为影像与互动成果</b><small>制作主题短视频、校园课程与《银信烽火》在线体验。</small></div></li>
            <li><span>04</span><div><b>建立长期开放的平台</b><small>让已有成果能够被浏览、检索、理解，也为后续补充保留结构。</small></div></li>
          </ol>
          <SiteLink to="/timeline" className="underLink">查看双轨时间轴 <Icon name="arrow" size={17}/></SiteLink>
        </div>
      </section>

      <section className="creativeSpotlight">
        <div className="creativeImage"><img src="/tidal-twin-seals-concept.webp" alt="《银信烽火》实体推理盒、卡牌、印章与路线图概念图" loading="lazy" decoding="async"/><span>概念设计图 · 非侨批原件</span></div>
        <div className="creativeCopy"><span className="overline light">CREATIVE LAB · 文创成果</span><h2>《银信烽火》</h2><h3>五人侨批主题阵营推理</h3><p>1941年的虚构批局，一笔去向不明的两千银元，五名各有秘密的在场者。玩家需要重构钱、信与人的去向，也理解侨批何以依赖信用穿越烽火。</p><div className="creativeFacts"><span>5人</span><span>60—90分钟</span><span>完整体验</span><span>非凶杀推理</span></div><div className="portalHeroActions"><SiteLink to="/creative/yinxin-fenghuo" className="portalPrimary pale">查看创作档案</SiteLink><SiteLink to="/creative/yinxin-fenghuo/play" className="portalSecondary dark">直接进入体验</SiteLink></div></div>
      </section>

      <section className="portalSection sourcePromise"><div className="sourceSeal">源</div><div><span className="overline">SOURCE & RESPONSIBILITY</span><h2>每一条资料，都说明它从哪里来</h2></div><div><p>页面优先标注团队实际调研的博物馆、侨批馆与档案馆；尚未确认的信息保持空缺，并随研究进展继续补充。</p><SiteLink to="/archives" className="underLink">按场馆浏览资料 <Icon name="arrow" size={17}/></SiteLink></div></section>
    </>
  );
}

function CollectionPage({ type }: { type: "learn" | "fieldwork" | "research" | "media" }) {
  const intro = pageIntros[type]!;
  const entries = publicContent.filter((entry) => entry.type === type);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState("全部");
  const places = type === "fieldwork" ? ["全部", "厦门", "泉州", "漳州", "校园"] : ["全部"];
  const filtered = entries.filter((entry) => {
    const matchesPlace = type !== "fieldwork" || place === "全部" || (place === "校园" ? entry.slug === "campus-handcraft-class" : entry.places.includes(place));
    return matchesPlace && searchableText(entry).includes(query.trim().toLocaleLowerCase("zh-CN"));
  });
  return (
    <main className="portalMain">
      <section className={`pageHero ${type}`}><Breadcrumbs items={[{ label: contentTypeLabels[type] }]}/><div><span className="overline">{intro.eyebrow}</span><h1>{intro.title}</h1><p>{intro.lead}</p></div><aside><strong>{entries.length}</strong><span>条展陈内容</span><small>按来源与主题持续补充</small></aside></section>
      <section className="collectionToolbar"><label className="searchField"><Icon name="search" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索${contentTypeLabels[type]}…`}/></label>{type === "fieldwork" && <div className="filterPills" aria-label="按地区筛选">{places.map((item) => <button type="button" key={item} className={place === item ? "active" : ""} aria-pressed={place === item} onClick={() => setPlace(item)}>{item}</button>)}</div>}<span className="resultCount">显示 {filtered.length} / {entries.length}</span></section>
      <section className={`collectionGrid ${type}`}>{filtered.map((entry) => <ContentCard key={entry.id} entry={entry}/>)}</section>
      {filtered.length === 0 && <EmptyState title="没有找到匹配内容" body="换一个关键词或地区试试。"/>}
    </main>
  );
}

function archiveTitle(record: ArchiveIndexRecord) {
  return record.title || record.context || "资料名称待补充";
}

function archiveContext(record: ArchiveIndexRecord) {
  const title = archiveTitle(record);
  if (title === "水客") return "水客是往返海内外、受托携带银信与家乡物产的个体中介；随着业务发展，部分递送职能逐渐由批局承担。";
  if (title === "侨批业经营理念") return "侨批行业强调顾客至上、公平诚信的经营理念（两张相关图像）。";
  if (title === "侨批寄件计费工具") return "用于计算侨批寄件费用的工具（两张相关图像）。";
  if (title === "侨批的文化内涵") return "展陈材料介绍侨批承载的文化记忆与精神内涵。";
  if (title === "侨批家书例页") return "侨批家书例页，展示信笺文字、版式与相关印记。";
  if (title === "关心子女读书") return "展陈材料呈现侨批对孩子读书情况的关心。";
  if (title === "对家人的叮嘱") return "侨批中写给家人的生活叮嘱。";
  if (title === "对祖国的关心") return "侨批文字中表达了对祖国的关心。";
  if (title === "出洋路上的艰辛") return "展陈材料介绍华侨出洋途中的艰辛经历。";
  if (title === "侨批中的海外思想") return "展陈材料介绍侨批在跨文化往来中传递海外思想与见闻的作用。";
  return record.context.replaceAll("桥批", "侨批").replace("（上下图片）", "（两张相关图像）").replace("（上下两张图片）", "（两张相关图像）");
}

function ArchiveRecordCard({ records }: { records: ArchiveIndexRecord[] }) {
  const record = records[0];
  const idLabel = records.length > 1 ? `${records[0].id}—${records[records.length - 1].id}` : record.id;
  return (
    <article className="archiveRecordCard">
      <div className="archiveRecordThumb"><img src={`/archive/${record.id}.webp`} alt={`${record.sourceInstitution ?? "侨批场馆"}采集的${archiveTitle(record)}`} loading="lazy" decoding="async"/></div>
      <div className="archiveRecordTop"><span className="archiveRecordId">{idLabel}</span><span className="archiveSource">{record.sourceInstitution}</span></div>
      <h3>{archiveTitle(record)}</h3>
      <p>{record.category} · {record.subcategory}</p>
      <div className="archiveRecordMeta"><span>{records.length} 件相关图像</span><span>{record.materialType ?? "图像资料"}</span></div>
      <SiteLink to={`/archives/${record.id}`} className="cardLink">查看资料说明 <Icon name="arrow" size={17}/></SiteLink>
    </article>
  );
}

function ArchivesPage() {
  const entry = publicContent.find((item) => item.slug === "qiaopi-index-v1");
  const records = entry?.archiveRecords ?? [];
  const stats = entry?.archiveStats;
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("全部来源");
  const [category, setCategory] = useState("全部类别");
  const [subcategory, setSubcategory] = useState("全部主题");
  const [view, setView] = useState<"card" | "list">("card");
  const sources = ["全部来源", ...Array.from(new Set(records.map((record) => record.sourceInstitution).filter(Boolean) as string[]))];
  const categories = ["全部类别", ...Array.from(new Set(records.map((record) => record.category)))];
  const topicRecords = records.filter((record) => (source === "全部来源" || record.sourceInstitution === source) && (category === "全部类别" || record.category === category));
  const subcategories = ["全部主题", ...Array.from(new Set(topicRecords.map((record) => record.subcategory)))];
  useEffect(() => {
    if (!subcategories.includes(subcategory)) setSubcategory("全部主题");
  }, [source, category, subcategory, subcategories]);
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  const filtered = records.filter((record) => {
    const haystack = [record.id, archiveTitle(record), archiveContext(record), record.category, record.subcategory, record.sourceInstitution ?? ""].join(" ").toLocaleLowerCase("zh-CN");
    return (!normalized || haystack.includes(normalized)) && (source === "全部来源" || record.sourceInstitution === source) && (category === "全部类别" || record.category === category) && (subcategory === "全部主题" || record.subcategory === subcategory);
  });
  const groups = Array.from(filtered.reduce((items, record) => {
    const key = [archiveTitle(record), record.category, record.subcategory, record.sourceInstitution].join("|");
    const group = items.get(key) ?? [];
    group.push(record);
    items.set(key, group);
    return items;
  }, new Map<string, ArchiveIndexRecord[]>()).values());
  const total = stats?.total ?? records.length;
  return (
    <main className="portalMain archivePage">
      <section className="pageHero archive"><Breadcrumbs items={[{ label: "侨批档案" }]}/><div><span className="overline">ARCHIVES · 场馆资料导览</span><h1>按场馆、内容类别与主题浏览侨批资料</h1><p>本页整理团队在泉州华侨历史博物馆与泉州侨批馆获取的 68 条图像资料。成组图片合并展示，避免同一标题重复出现；每组仍保留原有索引编号。</p></div><aside><strong>{total}</strong><span>条图像资料</span><small>来自泉州两处场馆</small></aside></section>
      {stats && <section className="archiveStatsBand"><div><strong>{stats.total}</strong><span>图像资料</span><small>QP-001—QP-068</small></div><div><strong>{sources.length - 1}</strong><span>采集场馆</span><small>来源清晰可查</small></div><div><strong>{categories.length - 1}</strong><span>内容类别</span><small>华侨史料 · 侨批档案</small></div><div><strong>{new Set(records.map((record) => record.subcategory)).size}</strong><span>主题方向</span><small>从出洋到家书与汇兑</small></div></section>}
      <section className="archiveIndexNotice"><Icon name="archive" size={25}/><div><span className="overline">COLLECTION GUIDE · 档案导览</span><h2>两馆资料，按来源与主题重新编目</h2><p>同一说明下的多张图片合并为一组，长段落改为简明标题；访客可先选场馆，再按内容类别和主题逐层筛选。</p></div><SiteLink to={entry ? entryPath(entry) : "/archives"} className="underLink">了解资料整理方式 <Icon name="arrow" size={17}/></SiteLink></section>
      <section className="archiveWorkbench">
        <div className="archiveSearchRow"><label className="searchField"><Icon name="search" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索编号、标题、场馆或主题…"/></label><div className="viewToggle"><button type="button" className={view === "card" ? "active" : ""} onClick={() => setView("card")}>卡片</button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>列表</button></div></div>
        <div className="archiveFilters"><div className="archiveFilterGroup"><small>采集场馆</small>{sources.map((item) => <button type="button" key={item} className={source === item ? "active" : ""} onClick={() => setSource(item)}>{item}</button>)}</div><div className="archiveFilterGroup"><small>内容类别</small>{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="archiveFilterGroup"><small>主题</small>{subcategories.map((item) => <button type="button" key={item} className={subcategory === item ? "active" : ""} onClick={() => setSubcategory(item)}>{item}</button>)}</div><span className="resultCount">显示 {groups.length} 组 / {filtered.length} 件</span></div>
      </section>
      {filtered.length ? <section className={view === "card" ? "archiveRecordGrid" : "archiveRecordList"}>{groups.map((group) => <ArchiveRecordCard key={group[0].id} records={group}/>)}</section> : <EmptyState title="没有找到匹配资料" body="换一个编号、场馆或主题试试。"/>}
      <section className="accessPolicy"><Icon name="shield" size={28}/><div><h3>浏览说明</h3><p>本页已接入团队在两处场馆采集的 68 张图像，并保留原始整理编号、主题和来源。图片用于侨批文化学习与项目成果展示；场馆正式馆藏名称、权利与释读信息仍以馆方资料为准。</p></div></section>
    </main>
  );
}

function ArchiveRecordPage({ record }: { record: ArchiveIndexRecord }) {
  const entry = publicContent.find((item) => item.slug === "qiaopi-index-v1");
  const relatedRecords = entry?.archiveRecords?.filter((item) => archiveTitle(item) === archiveTitle(record) && item.sourceInstitution === record.sourceInstitution) ?? [record];
  const idLabel = relatedRecords.length > 1 ? `${relatedRecords[0].id}—${relatedRecords[relatedRecords.length - 1].id}` : record.id;
  return (
    <main className="portalMain archiveRecordPage">
      <Breadcrumbs items={[{ label: "侨批档案", to: "/archives" }, { label: record.id }]}/>
      <article className="archiveRecordArticle"><header><div className="archiveRecordTop"><span className="archiveRecordId">{idLabel}</span><span className="archiveSource">{record.sourceInstitution}</span></div><span className="overline">团队采集 · 场馆图像资料</span><h1>{archiveTitle(record)}</h1><p>{archiveContext(record) !== archiveTitle(record) ? archiveContext(record) : `本组共收录 ${relatedRecords.length} 件相关图像资料。`}</p></header><section className="archiveImageGallery" aria-label="图像资料">{relatedRecords.map((item) => <figure key={item.id}><a href={`/archive/${item.id}.webp`} target="_blank" rel="noreferrer"><img src={`/archive/${item.id}.webp`} alt={`${item.sourceInstitution ?? "侨批场馆"}采集的${archiveTitle(item)}`} decoding="async"/></a><figcaption><b>{item.id}</b><span>{archiveContext(item)}</span></figcaption></figure>)}</section><section className="recordFacts"><div><small>采集来源</small><b>{record.sourceInstitution ?? "来源待补充"}</b></div><div><small>内容类别</small><b>{record.category}</b></div><div><small>主题</small><b>{record.subcategory}</b></div><div><small>索引编号</small><b>{idLabel}</b></div><div><small>资料数量</small><b>{relatedRecords.length} 件</b></div><div><small>材料形式</small><b>{record.materialType ?? "图像资料"}</b></div></section><aside className="sourceBox"><div><Icon name="shield" size={24}/><h2>资料来源</h2></div><p><b>采集场馆</b><span>{record.sourceInstitution ?? "来源待补充"}</span><small>团队在场馆调研过程中拍摄并整理；图片用于侨批文化学习与项目成果展示，展品权利归相应场馆或权利人所有。</small></p><p><b>整理编号</b><span>{idLabel}</span><small>编号用于保持同组图片、说明文字及后续研究材料之间的对应关系。</small></p></aside><SiteLink to="/archives" className="underLink">返回资料浏览 <Icon name="arrow" size={17}/></SiteLink></article>
    </main>
  );
}

function RoutesPage() {
  return (
    <main className="portalMain">
      <section className="pageHero routes"><Breadcrumbs items={[{ label: "侨路地图" }]}/><div><span className="overline">ROUTES · 第一版概念节点</span><h1>山海不是空白，而是一段段由人接力的路</h1><p>当前数据足以确认团队在厦门、泉州、漳州的调研节点；具体海外城市与每封侨批的真实路径，等原件和编目信息补齐后再关联。</p></div><aside><strong>3</strong><span>座已调研城市</span><small>海外节点暂不做未经来源支持的精确连线</small></aside></section>
      <section className="routeMapPanel">
        <div className="mapLegend"><span><i className="researchNode"></i>项目调研节点</span><span><i className="futureNode"></i>待档案补充节点</span><b>概念示意 · 非精确地理路线</b></div>
        <svg className="routeMapSvg" viewBox="0 0 1000 520" role="img" aria-label="南洋侨居地至厦门、漳州、泉州的概念节点图">
          <path className="seaWave" d="M20 415 C160 365 255 460 390 410 S630 355 780 410 940 440 1010 385"/>
          <path className="seaWave second" d="M-10 455 C150 405 255 495 410 450 S655 398 810 450 930 465 1020 430"/>
          <path className="routeArc" d="M180 350 C320 175 480 195 625 245"/>
          <path className="routeArc delay" d="M180 350 C365 305 520 310 745 185"/>
          <path className="routeArc delay2" d="M180 350 C390 390 565 350 820 295"/>
          <g className="mapNode future"><circle cx="180" cy="350" r="12"/><circle cx="180" cy="350" r="22"/><text x="180" y="315" textAnchor="middle">南洋侨居地</text><text className="nodeNote" x="180" y="392" textAnchor="middle">具体城市随档案补充</text></g>
          <g className="mapNode"><circle cx="625" cy="245" r="11"/><text x="625" y="215" textAnchor="middle">厦门</text><text className="nodeNote" x="625" y="275" textAnchor="middle">海沧区档案馆</text></g>
          <g className="mapNode"><circle cx="745" cy="185" r="11"/><text x="745" y="155" textAnchor="middle">泉州</text><text className="nodeNote" x="745" y="215" textAnchor="middle">两处场馆</text></g>
          <g className="mapNode"><circle cx="820" cy="295" r="11"/><text x="820" y="265" textAnchor="middle">漳州</text><text className="nodeNote" x="820" y="325" textAnchor="middle">三处文化现场</text></g>
        </svg>
        <div className="mapCards"><article><b>泉州</b><span>华侨迁移 · 展陈转译</span><SiteLink to="/fieldwork/quanzhou-overseas-chinese-museum">查看实践记录</SiteLink></article><article><b>漳州</b><span>月港 · 南风 · 天一信局</span><SiteLink to="/fieldwork/tianyi-credit-bureau">查看实践记录</SiteLink></article><article><b>厦门</b><span>档案编目 · 数字保护</span><SiteLink to="/fieldwork/haicang-archives">查看实践记录</SiteLink></article></div>
      </section>
    </main>
  );
}

function TimelinePage() {
  const history = [
    ["19世纪中期以后", "侨批逐渐形成", "项目文献综述把侨批放在近代海外移民与民间银信网络中理解。"],
    ["20世纪", "跨海家庭与侨乡社会的记录", "家书、汇款凭证与流转印记共同留下生活史材料。"],
    ["2013", "入选《世界记忆名录》", "侨批档案的世界意义获得国际层面的确认。"],
    ["今天", "保护、释读与数字开放", "数字化继续面对纸张、文字、权利与隐私分级问题。"],
  ];
  const project = [
    ["2025 · 实践阶段", "厦漳泉三地调研", "走访五处场馆，补充天一信局旧址资料，并开展校园侨批手工课。"],
    ["2025 · 项目申报", "“纸短情长”研究立项准备", "围绕海丝记忆与闽南侨乡文化认同形成研究框架。"],
    ["2026 · 文创实验", "《银信烽火》", "五人侨批主题阵营推理完成网页化互动体验。"],
    ["2026 · 数字平台", "从单一成果走向资料库", "建立公开分级、结构化内容与可持续导入流程。"],
  ];
  return (
    <main className="portalMain"><section className="pageHero timeline"><Breadcrumbs items={[{ label: "时间轴" }]}/><div><span className="overline">TIMELINE · 两条时间线</span><h1>一条属于侨批，一条属于我们如何走近它</h1><p>历史节点只采用现有资料能够支持的表述；团队成果与未来计划分开记录，预期成果不写成已经完成。</p></div><aside><strong>2</strong><span>条并行线索</span><small>侨批历史 / 项目历程</small></aside></section>
      <section className="dualTimeline"><div><div className="timelineHead"><span>HISTORY</span><h2>侨批历史</h2></div>{history.map(([date, title, body]) => <article key={date}><time>{date}</time><div><h3>{title}</h3><p>{body}</p></div></article>)}</div><div><div className="timelineHead project"><span>OUR PATH</span><h2>研究历程</h2></div>{project.map(([date, title, body]) => <article key={date}><time>{date}</time><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
      <section className="timelineNote"><Icon name="shield" size={26}/><p>仍需进一步核实的数量、日期与奖项信息，待依据补充后再纳入时间轴。</p></section>
    </main>
  );
}

function CreativePage() {
  const entries = publicContent.filter((entry) => entry.type === "creative");
  const supportingEntries = entries.filter((entry) => entry.slug !== "yinxin-fenghuo");
  return (
    <main className="portalMain"><section className="pageHero creative"><Breadcrumbs items={[{ label: "文创实验室" }]}/><div><span className="overline">CREATIVE LAB · 文化如何进入青年生活</span><h1>研究之后，再试着把一封侨批讲给今天</h1><p>剧本杀、IP、明信片、信纸与数字互动都可以是文化转译的方法。每项成果同时说明玩法、创作过程与文化边界。</p></div><aside><strong>{entries.length}</strong><span>项开放成果</span><small>《银信烽火》可直接在线体验</small></aside></section>
      <section className="creativeIndex"><div className="creativeLeadCard"><img src="/tidal-twin-seals-concept.webp" alt="《银信烽火》文创概念设计图" decoding="async"/><div><span>已完成 · 可体验</span><h2>《银信烽火》</h2><p>五人侨批主题阵营推理。用资金链、暗语与秘密投票，让“信款合一”和批局信用成为真正的玩法。</p><SiteLink to="/creative/yinxin-fenghuo" className="portalPrimary">查看成果档案 <Icon name="arrow" size={18}/></SiteLink></div></div>{supportingEntries.length > 0 && <section className="creativeSupporting"><div className="sectionHeading"><div><span className="overline">SUPPORTING WORKS</span><h2>从角色、视觉到传播的延伸</h2></div><p>这些条目来自同一研究与文创项目，说明设计阶段与文化边界，并将继续接入正式图稿、样机和其他青年文创成果。</p></div><div className="creativeSupportingGrid">{supportingEntries.map((entry) => <ContentCard key={entry.id} entry={entry}/>)}</div></section>}<div className="futureLab"><span className="overline">NEXT EXPERIMENTS</span><h2>实验架已经搭好</h2><div><article><span>01</span><h3>纸本设计</h3><p>信纸、明信片与路线印章等待真实素材和打样资料接入。</p></article><article><span>02</span><h3>数字互动</h3><p>档案地图、图像对读与互动释读将在数据增长后继续开发。</p></article><article><span>03</span><h3>更多成果</h3><p>后续可继续接入经授权的设计、展陈和研学应用。</p></article></div></div></section>
    </main>
  );
}

function YinxinDetailPage() {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const entry = publicContent.find((item) => item.slug === "yinxin-fenghuo")!;
  return (
    <main className="portalMain yinxinDetail"><Breadcrumbs items={[{ label: "文创实验室", to: "/creative" }, { label: "银信烽火" }]}/>
      <section className="yinxinProjectHero"><div><span className="overline light">文创成果 · INTERACTIVE MYSTERY</span><h1>银信烽火</h1><h2>五人侨批主题阵营推理</h2><p>不是从“谁是凶手”开始，而是先回答：一笔两千银元，为什么从账上消失？</p><div className="creativeFacts"><span>5人</span><span>60—90分钟</span><span>一台设备</span><span>完整体验</span></div><SiteLink to="/creative/yinxin-fenghuo/play" className="portalPrimary pale">进入完整体验 <Icon name="arrow" size={18}/></SiteLink></div><button className="heroImageButton" onClick={() => setLightbox("/og-v2-display.webp")}><img src="/og-v2-display.webp" alt="《银信烽火》视觉主图：海图、批信与夜灯" decoding="async"/><span>点击放大视觉主图</span></button></section>
      <section className="projectNarrative"><div className="projectSidebar"><b>成果档案</b><button type="button" onClick={() => scrollToSection("origin")}>创作缘起</button><button type="button" onClick={() => scrollToSection("translation")}>文化转译</button><button type="button" onClick={() => scrollToSection("play")}>玩法结构</button><button type="button" onClick={() => scrollToSection("boundary")}>创作边界</button></div><div className="projectBody"><article id="origin"><span>01 · ORIGIN</span><h2>为什么用阵营推理讲侨批</h2><p>{entry.body[0]}</p><p>玩家面对的是一条可能断裂的信用网络。每个人都有不能立刻公开的秘密，但“有秘密”不等于“有罪”；这种张力让历史题材不必依赖凶杀，也能产生真实的选择压力。</p></article><article id="translation"><span>02 · TRANSLATION</span><h2>把文化知识变成推理机制</h2><div className="translationGrid"><div><b>信与款</b><p>金额不是背景数字，而是必须亲手重构的主线。</p></div><div><b>批局信用</b><p>角色的信誉、垫款与隐瞒共同影响判断。</p></div><div><b>跨海汇路</b><p>路线、经手者与暗语成为线索之间的连接。</p></div><div><b>家与国</b><p>终局同时衡量真相、交通员安全与共同选择。</p></div></div></article><article id="play"><span>03 · HOW TO PLAY</span><h2>四轮完成一场五人推理</h2><ol className="playSteps"><li><b>断汇疑云</b><span>五人依次私查证物，决定公开或保留。</span></li><li><b>深度调查</b><span>调查角色，重复调查可触发更深证据。</span></li><li><b>银路重构</b><span>拼合三笔用途，并破解家常话中的暗语。</span></li><li><b>秘密投票</b><span>独立判断钱款去向、潜伏者与交通员。</span></li></ol></article><article id="boundary"><span>04 · BOUNDARY</span><h2>真实制度，复合人物，虚构案件</h2><p>{entry.body[2]}</p><div className="boundaryNote"><Icon name="shield" size={25}/><span>游戏中的人物、金额、暗语和案件服务于互动叙事，不作为历史档案引用。史实原型页与项目资料页保留各自来源。</span></div></article><article className="projectSources"><span>创作来源</span>{entry.sources.map((source) => <p key={source.sourceId}><b>项目成果</b>{source.label} · {source.locator}</p>)}</article><div className="finalPlayCall"><span className="gameStamp">玩</span><div><h2>准备好把信、款与人放回同一条路了吗？</h2><p>剧情、角色、证据、投票、结算和文创展示均已完整保留。</p></div><SiteLink to="/creative/yinxin-fenghuo/play" className="portalPrimary">五人开局 <Icon name="arrow" size={18}/></SiteLink></div></div></section>
      {lightbox && <div className="portalLightbox" role="dialog" aria-modal="true" aria-label="图像查看" onClick={() => setLightbox(null)}><button aria-label="关闭图像"><Icon name="close" size={24}/></button><img src={lightbox} alt="《银信烽火》视觉主图放大图"/></div>}
    </main>
  );
}

function ContentDetailPage({ entry }: { entry: ContentEntry }) {
  const siblings = publicContent.filter((item) => item.type === entry.type);
  const index = siblings.findIndex((item) => item.id === entry.id);
  const previous = siblings[index - 1];
  const next = siblings[index + 1];
  const related = publicContent.filter((item) => item.id !== entry.id && item.tags.some((tag) => entry.tags.includes(tag))).slice(0, 3);
  const bilibiliId = entry.externalUrl?.match(/(BV[0-9A-Za-z]+)/)?.[1];
  const videoEmbedUrl = bilibiliId ? `https://player.bilibili.com/player.html?bvid=${bilibiliId}&page=1&high_quality=1` : null;
  return (
    <main className="portalMain detailPage"><Breadcrumbs items={[{ label: contentTypeLabels[entry.type], to: entry.type === "archive" ? "/archives" : `/${entry.type}` }, { label: entry.title }]}/><article className="detailArticle"><header><span className="overline">{entry.eyebrow ?? contentTypeLabels[entry.type]}</span><h1>{entry.title}</h1><p>{entry.summary}</p><div className="detailMeta"><span>{entry.dateLabel ?? "时间暂无资料"}</span><span>{entry.places.length ? entry.places.join(" · ") : "地点暂无资料"}</span><VerificationBadge entry={entry}/></div></header>{entry.cover && <figure><img src={entry.cover} alt={entry.coverAlt ?? ""}/>{entry.coverAlt && <figcaption>{entry.coverAlt}</figcaption>}</figure>}{entry.archiveStats && <section className="archiveDetailStats"><div><strong>{entry.archiveStats.total}</strong><span>条图像资料</span></div><div><strong>{new Set(entry.archiveRecords?.map((record) => record.sourceInstitution)).size}</strong><span>采集场馆</span></div><div><strong>{new Set(entry.archiveRecords?.map((record) => record.category)).size}</strong><span>内容类别</span></div><div><strong>{new Set(entry.archiveRecords?.map((record) => record.subcategory)).size}</strong><span>主题方向</span></div></section>}<div className="articleBody">{entry.body.map((paragraph, paragraphIndex) => <p key={`${entry.id}-${paragraphIndex}`}>{paragraph}</p>)}</div>{entry.externalUrl && entry.mediaMeta && <section className="mediaMetaPanel"><div className="mediaMetaHead"><span className="overline">WATCH · VIDEO RECORD</span><h2>影像记录</h2></div>{videoEmbedUrl && <div className="videoEmbed"><iframe src={videoEmbedUrl} title={entry.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy"></iframe></div>}<div className="mediaMetaGrid"><div><small>片长</small><b>{entry.mediaMeta.duration ?? "暂无资料"}</b></div><div><small>规格</small><b>{entry.mediaMeta.resolution ?? "暂无资料"}</b></div><div><small>平台</small><b>{entry.mediaMeta.platform ?? "暂无资料"}</b></div></div><p>{entry.mediaMeta.awardNote}</p><a className="portalPrimary" href={entry.externalUrl} target="_blank" rel="noreferrer">在 Bilibili 打开 <Icon name="arrow" size={17}/></a></section>}<div className="articleTags">{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><aside className="sourceBox"><div><Icon name="shield" size={24}/><h2>资料来源</h2></div>{entry.sources.map((source) => <p key={`${entry.id}-${source.sourceId}`}><b>采集来源</b><span>{source.label}</span><small>{source.locator}</small></p>)}</aside></article>
      <nav className="entryPager">{previous ? <SiteLink to={entryPath(previous)}><small>上一篇</small><b>{previous.title}</b></SiteLink> : <span></span>}{next ? <SiteLink to={entryPath(next)}><small>下一篇</small><b>{next.title}</b></SiteLink> : <span></span>}</nav>
      {related.length > 0 && <section className="relatedSection"><span className="overline">RELATED</span><h2>相关阅读</h2><div className="relatedGrid">{related.map((item) => <ContentCard key={item.id} entry={item}/>)}</div></section>}
    </main>
  );
}

function StoriesPage() {
  return <main className="portalMain"><section className="pageHero stories"><Breadcrumbs items={[{ label: "人物与侨乡故事" }]}/><div><span className="overline">STORIES · 从真实材料中提取叙事</span><h1>人会被写进信里，也会被档案遮住一部分</h1><p>我们正在从调研、访谈与侨批线索中整理人物关系。未确认采访授权、原件来源与身份边界前，不把复合故事包装成真人经历。</p></div><aside><strong>0</strong><span>条开放人物故事</span><small>结构已建立，等待真实材料接入</small></aside></section><EmptyState title="人物故事正在核对授权" body="后续将围绕南洋谋生者、留守家属、侨乡女性、批脚与家族记忆建立条目，并明确区分原文、口述与研究者叙述。"/></main>;
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  const results = normalized ? publicContent.filter((entry) => searchableText(entry).includes(normalized)) : publicContent;
  const grouped = results.reduce<Partial<Record<ContentType, ContentEntry[]>>>((items, entry) => {
    (items[entry.type] ??= []).push(entry);
    return items;
  }, {});
  const groups = Object.entries(grouped) as [ContentType, ContentEntry[]][];
  return <main className="portalMain searchPage"><section className="searchHero"><Breadcrumbs items={[{ label: "全站搜索" }]}/><span className="overline">SEARCH · 站内内容</span><h1>寻找一封信、一处地方，或一个研究问题</h1><label><Icon name="search" size={24}/><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入侨批、泉州、数字化、银信烽火…"/><small>{results.length} 条结果</small></label><p>可搜索侨批知识、场馆实践、研究成果、影像与文创内容。</p></section><section className="searchResults">{groups.map(([type, entries]) => <div key={type}><h2>{contentTypeLabels[type]}<span>{entries.length}</span></h2>{entries.map((entry) => <SiteLink to={entryPath(entry)} key={entry.id}><div><span>{entry.dateLabel ?? contentTypeLabels[entry.type]}</span><h3>{entry.title}</h3><p>{entry.summary}</p></div><Icon name="arrow" size={20}/></SiteLink>)}</div>)}{results.length === 0 && <EmptyState title="没有找到匹配内容" body="试试更短的关键词，或从栏目导航开始浏览。"/>}</section></main>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <section className="emptyState"><span className="emptySeal">待</span><div><h2>{title}</h2><p>{body}</p></div></section>;
}

function NotFoundPage() {
  return <main className="portalMain"><section className="notFound"><span>404</span><h1>这封信还没有地址</h1><p>页面可能尚未开放，或链接已经变化。</p><SiteLink to="/" className="portalPrimary">返回首页</SiteLink></section></main>;
}

function resolvePage(path: string) {
  if (path === "/") return <HomePage/>;
  if (path === "/learn") return <CollectionPage type="learn"/>;
  if (path === "/archives") return <ArchivesPage/>;
  if (path === "/stories") return <StoriesPage/>;
  if (path === "/routes") return <RoutesPage/>;
  if (path === "/timeline") return <TimelinePage/>;
  if (path === "/fieldwork") return <CollectionPage type="fieldwork"/>;
  if (path === "/research") return <CollectionPage type="research"/>;
  if (path === "/media") return <CollectionPage type="media"/>;
  if (path === "/creative") return <CreativePage/>;
  if (path === "/creative/yinxin-fenghuo") return <YinxinDetailPage/>;
  if (path === "/search") return <SearchPage/>;
  const archiveRecordMatch = path.match(/^\/archives\/(QP-\d{3})$/i);
  if (archiveRecordMatch) {
    const archiveEntry = publicContent.find((item) => item.slug === "qiaopi-index-v1");
    const record = archiveEntry?.archiveRecords?.find((item) => item.id.toLowerCase() === archiveRecordMatch[1].toLowerCase());
    if (record) return <ArchiveRecordPage record={record}/>;
  }
  const detailMatch = path.match(/^\/(learn|archive|fieldwork|research|media|creative)\/([^/]+)$/);
  if (detailMatch) {
    const entry = publicContent.find((item) => item.type === detailMatch[1] && item.slug === detailMatch[2]);
    if (entry) return <ContentDetailPage entry={entry}/>;
  }
  return <NotFoundPage/>;
}

function pageMetadata(path: string) {
  const archiveRecordMatch = path.match(/^\/archives\/(QP-\d{3})$/i);
  if (archiveRecordMatch) {
    const record = publicContent.find((item) => item.slug === "qiaopi-index-v1")?.archiveRecords?.find((item) => item.id.toLowerCase() === archiveRecordMatch[1].toLowerCase());
    if (record) return { title: `${archiveTitle(record)}｜纸短情长`, description: `${record.sourceInstitution ?? "侨批场馆"}资料索引：${record.category} · ${record.subcategory}` };
  }
  const detailMatch = path.match(/^\/(learn|archive|fieldwork|research|media|creative)\/([^/]+)$/);
  const entry = detailMatch ? publicContent.find((item) => item.type === detailMatch[1] && item.slug === detailMatch[2]) : undefined;
  if (entry) return { title: `${entry.title}｜纸短情长`, description: entry.summary };
  const staticMeta: Record<string, [string, string]> = {
    "/": ["纸短情长｜侨批文化数字展陈与研究平台", "从一纸家书，到跨越山海的家国记忆。浏览侨批知识、实践足迹、研究成果、影像档案与《银信烽火》文创体验。"],
    "/learn": ["认识侨批｜纸短情长", "从词义、信款合一、跨海流转与数字保护认识侨批。"],
    "/archives": ["侨批档案库｜纸短情长", "浏览来自泉州华侨历史博物馆与泉州侨批馆的 68 条图像资料，按场馆、类别与主题筛选。"],
    "/routes": ["侨路地图｜纸短情长", "从南洋侨居地到闽南侨乡，认识侨批由水客、批局与递送者共同维系的跨海路径。"],
    "/timeline": ["侨批与项目历程｜纸短情长", "对照侨批历史与团队从田野调研、研究写作到数字展陈的项目历程。"],
    "/fieldwork": ["实践足迹｜纸短情长", "厦门、泉州、漳州六处文化现场与校园教育实践记录。"],
    "/research": ["研究成果｜纸短情长", "侨批、海丝记忆与闽南侨乡文化认同的项目研究。"],
    "/media": ["影像档案｜纸短情长", "侨批主题影像与传播成果的来源化整理。"],
    "/creative": ["文创实验室｜纸短情长", "让侨批文化进入当代青年生活的互动与视觉实验。"],
    "/creative/yinxin-fenghuo/play": ["《银信烽火》在线体验｜纸短情长", "进入五人侨批主题阵营推理体验，在信、款与人的流转中理解批局信用。"],
    "/search": ["全站搜索｜纸短情长", "检索侨批知识、场馆实践、研究成果、影像档案与青年文创。"],
  };
  const selected = staticMeta[path] ?? ["纸短情长", "侨批文化数字展陈与研究平台"];
  return { title: selected[0], description: selected[1] };
}

export default function App() {
  const [path, navigate] = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const isGame = path === "/creative/yinxin-fenghuo/play";
  useEffect(() => {
    document.body.dataset.siteMode = isGame ? "game" : "portal";
    if (!isGame) window.scrollTo({ top: 0 });
    setMenuOpen(false);
    const meta = pageMetadata(path);
    document.title = meta.title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", meta.description);
  }, [path, isGame]);

  const page = useMemo(() => resolvePage(path), [path]);
  if (isGame) return <YinxinFenghuo onExit={() => navigate("/creative/yinxin-fenghuo")}/>;
  return <div className="portalSite"><button className="skipLink" type="button" onClick={() => scrollToSection("main-content")}>跳到主要内容</button><PortalHeader path={path} menuOpen={menuOpen} setMenuOpen={setMenuOpen}/><div id="main-content">{page}</div><PortalFooter/></div>;
}
