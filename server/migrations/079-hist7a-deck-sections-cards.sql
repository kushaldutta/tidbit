-- Migration 079: HISTORY 7A — The United States from Settlement to Civil
-- War, new preset deck.
-- UC Berkeley Fall 2026: David M. Henkin, TuTh 15:30-16:59, Undergrad
-- Academic Bldg 100. Discussion sections required. Fulfills American
-- Cultures, American History and Institutions, L&S Historical Studies
-- and Social and Behavioral Sciences.
-- Catalog: intro to US history from European colonization to the end of
-- the Civil War, and to how historians use evidence. Two themes: (1)
-- origins of the groups called European-Americans, Native Americans,
-- and African Americans; (2) how democratic political institutions
-- emerged in an economy that depended on slave labor and violent land
-- acquisition. Lecture description (Henkin): from antiquity through the
-- Civil War; interactions among Native Americans, Europeans, and
-- Africans; colonial societies; founding and political institutions;
-- competing claims about power, rights, salvation, and the good life;
-- resonances with the present. Requirements: in-class exams (heavy IDs
-- in Henkin years), short document analyses, section. Distinct from
-- APUSH (periodization drills) and from HISTORY 7B (Reconstruction to
-- present). 7B is not in the FA26 picker.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'hist7a',
  'HISTORY 7A',
  'US from settlement to Civil War — Native, Atlantic, slavery, democracy (Henkin)',
  'uc-berkeley:hist7a:fa26',
  'system',
  true,
  '🦅',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

UPDATE public.classes
SET title = 'The United States from Settlement to Civil War'
WHERE id = 'uc-berkeley:hist7a:fa26';

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'hist7a');

DELETE FROM public.tidbits
WHERE category_id = 'hist7a';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'hist7a');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'hist7a');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('practice',  'Doing History and Native North America',
   'Evidence, 7A themes, Indigenous worlds before 1492', 0),
  ('atlantic',  'Atlantic Worlds and First Colonies',
   'Columbian exchange, Spanish empire, Native power', 1),
  ('colonies',  'Chesapeake, New England, Caribbean Slavery',
   'Tobacco, Puritans, Bacon, Barbados to Carolina', 2),
  ('empire',    'Eighteenth-Century Empire and Crisis',
   'Awakening, Seven Years War, imperial reform', 3),
  ('revolution','Independence and Revolutionary War',
   'Republic, Loyalists, Black and Native choices', 4),
  ('republic',  'Constitution and the Early Republic',
   '1787, 1790s, Haiti, Jefferson, 1812', 5),
  ('market',    'Market Revolution, Democracy, Removal',
   'Cotton, Jackson, gender, Indian Removal', 6),
  ('slavery',   'Cotton Kingdom, Reform, Abolition',
   'Second Middle Passage, Seneca Falls, politics of slavery', 7),
  ('crisis',    'Expansion and the Sectional Crisis',
   'Mexico, 1850, Kansas, Dred Scott, secession', 8),
  ('civilwar',  'Civil War and Emancipation',
   'Union, Confederacy, 1863-65, 13th Amendment', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'hist7a'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Doing History and Native North America
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'practice'
CROSS JOIN (VALUES
  (0,  '7A in one sentence',
       'The lands that became the United States, from Indigenous antiquity through the Civil War: how Native, European, and African peoples made one another, and how a republic claiming democracy grew on slave labor and taken land. FA26: David Henkin, TuTh 15:30-16:59, UAB 100, plus discussion. Two catalog themes stay on every exam. Distinct from APUSH (this is evidence plus argument, not a periodization checklist) and from 7B (after 1865).'),
  (1,  'the two catalog themes',
       '(1) Origins of the groups later called European-Americans, Native Americans, and African Americans — none of these names is a timeless essence; they are made in contact. (2) Democratic political institutions emerging inside an economy of slave labor and violent land acquisition. 7A: if your essay only celebrates the Constitution or only lists atrocities, you missed the assignment. Hold both.'),
  (2,  'how historians use evidence (Henkin)',
       'A source is not a window; it is a product of someone, for someone, with a purpose. Ask: who wrote, when, for what audience, what is left out? 7A: document analyses train this. An ID is not a Wikipedia sentence — it is a thing plus why it matters for a 7A theme. Henkin exams are famous for long ID lists; practice naming and arguing, not just dating.'),
  (3,  'primary vs secondary',
       'Primary: made in the period (letter, law, map, sermon, newspaper, oral tradition recorded later with care). Secondary: a historian''s argument about the past. 7A: lecture is secondary; the packet/docs are primary. You will be asked to use a document to challenge a lecture claim. "The textbook said" is not evidence.'),
  (4,  'presentism vs resonance',
       'Presentism: judging the past only by today''s categories as if people then shared them. Resonance (Henkin''s course language): noticing connections and contrasts with worlds we inhabit now without collapsing then into now. 7A: you can say a 1850 fugitive-slave case still structures policing debates; you cannot pretend Lincoln "would have tweeted."'),
  (5,  'Indigenous North America was not empty',
       'Tens of millions of people, hundreds of languages, cities, farms, confederacies, hunter-gatherer bands. The "virgin land" story is a colonial claim. 7A starts in antiquity because settlement is an encounter, not a founding on blank space. Theme 1 begins here: Native nations already had politics, gender orders, and diplomacy.'),
  (6,  'Cahokia and Mississippian worlds',
       'Cahokia (near today''s St. Louis): a massive mound city at its height around 1050-1200, corn agriculture, hierarchy, long-distance trade. Mississippian cultures across the Southeast and Midwest. 7A: urban Native America predates Jamestown by centuries. Decline and reorganization happened before and after Europeans; do not treat 1492 as the only turning point.'),
  (7,  'Eastern Woodlands politics',
       'Iroquois/Haudenosaunee Confederacy (Mohawk, Oneida, Onondaga, Cayuga, Seneca; Tuscarora later): council diplomacy, mourning wars, gendered labor (women and agriculture, men and hunting/war — simplified). Algonquian-speaking peoples of the Atlantic coast: sachems, seasonal mobility. 7A: these are the diplomatic counterparts Europeans met, not "tribes without government."'),
  (8,  'Southwest, Plains, Pacific (map card)',
       'Pueblo peoples: maize, towns, kivas, later Spanish missions. Pacific Northwest: salmon, potlatch, dense villages. Great Plains: after horses (post-1500s), some groups reorganized around bison. 7A: "Native America" is not one culture. An ID that says "Indians believed..." fails. Name a people and a place.'),
  (9,  'gender and kinship as historical forces',
       'Many Eastern nations were matrilineal; captives could be adopted. European colonists often misread Native gender (calling farming women "lazy men," etc.). 7A: gender is not extra credit. It structures labor, diplomacy, and who counts as kin — which later structures slavery and citizenship too.'),
  (10, 'oral tradition and archaeology as sources',
       '7A: not every past is in a European archive. Archaeology, Native oral histories, and later Native writing are evidence. Spanish and English observers are biased but usable if you read against the grain. The "no written records so no history" line is a 19th-century alibi, not a method.'),
  (11, '1492 is a date in an already-moving world',
       'The course title says settlement, but Henkin''s description starts in antiquity. 7A: European arrival is a rupture and a continuation of Native history. Disease, trade, and alliance will remake the continent — still, Native power lasts centuries (Pueblo Revolt, Comanche empire, etc.). Do not fast-forward to 1776 in week 2.'),
  (12, 'APUSH vs 7A on the opening',
       'APUSH: Period 1 key concepts, Columbian Exchange bullet list. 7A: Native worlds first, then exchange as a two-way (unequal) process, then argument about evidence. If they ask "why does this course begin before Columbus," answer with theme 1, not with AP period numbers.'),
  (13, 'American Cultures / AH&I (why you are here)',
       '7A meets American Cultures and American History and Institutions. That is not a sidebar: race-making and civic institutions are the syllabus. 7A: a "just the facts of the Revolution" essay that never mentions slavery or Native land will not satisfy the course, even if the dates are right.'),
  (14, 'practice exam move',
       'For any ID: define, date/place, and hitch it to a theme (people-making or democracy-plus-slavery/land). For a document: author, audience, purpose, one limit. Do not write "Native Americans were primitive then advanced." Name a polity. If the prompt is about today, use resonance, not presentism.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 2. Atlantic Worlds and First Colonies
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'atlantic'
CROSS JOIN (VALUES
  (0,  'Columbian exchange',
       'Transfer of plants, animals, people, microbes, and ideas across the Atlantic after 1492. Corn, potatoes, tomatoes to Europe/Africa/Asia; wheat, cattle, horses, sugar to the Americas; epidemic disease (smallpox and others) devastating Native populations. 7A: exchange is not a fair trade. Demographic collapse is a condition of later English "empty land" stories. Theme 1: new groups form in this wreckage and mixing.'),
  (1,  'why disease mattered politically',
       'Virgin-soil epidemics were not a natural accident separate from conquest; they traveled with war, slaving, and mission towns. 7A: fewer people meant more room for livestock and migrants, and more pressure on survivors to ally or flee. Do not reduce Native history to germs — survivors reorganized (see Pueblo Revolt, Iroquois expansion).'),
  (2,  'Spanish empire in North America',
       'After 1492 Caribbean and 1521 Mexico: conquest, encomienda, silver, Catholic mission. In what became the US: Florida (St. Augustine 1565), New Mexico (Onate, Santa Fe), later California missions. 7A: English colonies are late and small next to New Spain. Black Legend (English Protestant atrocity propaganda) is a source, not a fact-check.'),
  (3,  'Requerimiento and just-war talk',
       'A Spanish text read (often unreadably) to Native peoples demanding submission to Crown and Church. 7A: this is evidence of how Europeans legalized dispossession. Bartolome de las Casas criticized abuses; he still thought in Christian-imperial terms. Document skill: a "humanitarian" source can still assume Native inferiority.'),
  (4,  'Pueblo Revolt, 1680',
       'Popé and Pueblo communities expelled the Spanish from New Mexico for over a decade — the most successful Native revolt in North America against a European colony. Causes: missions, labor, drought, assault on kachina religion. 7A: Native power, not only victimization. Spanish return (1690s) was negotiated, not a simple reconquest.'),
  (5,  'French and Dutch in the interior',
       'New France: fur trade, Jesuit missions, Native alliance (Huron, later others), few settlers. Dutch New Netherland: commerce, Manhattan, slave trading already in the 1620s. 7A: English settler colonies were one Atlantic model among several. The "thirteen colonies" map is a later nationalist cartoon.'),
  (6,  'Roanoke and the English late start',
       '1580s Roanoke (lost colony) then 1607 Jamestown. England''s American project is a century after Spain''s. Motives mix: rivalry with Spain, land, commodities, Protestantism, surplus population. 7A: "freedom" is not the founding slogan of Virginia; profit and survival are.'),
  (7,  'Jamestown, Powhatan, tobacco',
       'Virginia Company, starving time, John Smith, then tobacco boom under Rolfe. Powhatan paramount chiefdom: diplomacy, war, and the 1622 uprising. Headright system and land hunger. 7A: the English colony lives by Native corn and then by an export crop that demands labor — which will become racial slavery. Pocahontas-as-romance is a later myth; she was a political actor and a captive.'),
  (8,  '1619 as a 7A problem, not a brand',
       '1619: first documented Africans in Virginia (from a Portuguese slaver via English privateers) and the first General Assembly. 7A: both "democracy" and "slavery" have origin stories that year, but status of Africans was not yet fully the later hereditary chattel system. Theme 2 in embryo: assembly plus unfree labor. Do not pretend 1619 invented either thing from nothing.'),
  (9,  'indenture vs slavery (early Chesapeake)',
       'Many English came as indentured servants (term of years, brutal, but not heritable race-slavery). Africans'' status hardened over the 1600s toward lifetime, heritable, racial slavery (laws on baptism, children''s status, interracial sex). 7A: race is made in law and practice, not discovered as biology. Bacon''s Rebellion (next section) is a turning-point story historians debate.'),
  (10, 'sugar, the Caribbean, and the real money',
       'Barbados and the Greater Antilles: sugar, deathly work regimes, majority-enslaved populations, enormous profits. 7A: mainland English colonies are the periphery of a Caribbean engine. Carolina and later the cotton South copy island slavery. If you only study Massachusetts, you miss the Atlantic economy.'),
  (11, 'Middle Passage',
       'Forced Atlantic crossing of enslaved Africans; mortality, packing, sale. Part of a larger African slaving complex involving African sellers and European buyers. 7A: African Americans as a group are made in this violence plus New World birth (creolization). Theme 1 is not a polite multicultural origin story.'),
  (12, 'maps that lie (7A method)',
       'A 1750 map of "British America" hides Native polities, French claims, and African majorities in some zones. 7A: always ask what a map is for (land title, war, missionary field). Henkin-style: everyday paper (newspapers, later the post) will matter more in the 1800s, but colonial maps already make claims.'),
  (13, 'APUSH vs 7A on empire',
       'APUSH: Spain/France/England comparison chart. 7A: power on the ground — who collected tribute, who died, who converted, who revolted. Pueblo Revolt should outrank a memorized encomienda definition. If they want Black Legend, say it is English propaganda and still point to real Spanish violence.'),
  (14, 'Atlantic exam move',
       'Name a Native polity and a European empire in the same answer. Columbian exchange: plants and death, not a food festival. 1619: assembly and Africans, status still in motion. Caribbean sugar explains mainland slavery better than Plymouth rock. Hitch to theme 1 (new peoples) or 2 (labor and land).')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 3. Chesapeake, New England, Caribbean Slavery
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'colonies'
CROSS JOIN (VALUES
  (0,  'New England: Puritan settler society',
       'Plymouth 1620, Massachusetts Bay 1630, "city upon a hill" (Winthrop) as a covenanted community, not a liberty slogan for later America. Towns, congregations, family migration, mixed farming, less plantation slavery than the South (slavery still existed). 7A: religious dissenters who persecuted other dissenters (Quakers, Anne Hutchinson, Roger Williams). Native relations: Pequot War, King Philip''s War.'),
  (1,  'King Philip''s War, 1675-76',
       'Metacom (King Philip), Wampanoag, and allies vs New England colonies: one of the deadliest wars per capita in American history. Native defeat, enslavement and exile of captives, Puritan narrative of providence. 7A: New England''s "peaceable kingdom" is a postwar story. Theme 2: land through war.'),
  (2,  'Chesapeake society',
       'Virginia and Maryland: tobacco, scattered plantations, unbalanced sex ratios early, high death rates, Anglican (Maryland also Catholic Calverts). House of Burgesses. 7A: a staple-export colony with a labor problem. Compared with New England: fewer towns, weaker churches, more bound labor. Do not call it "the South" yet — Carolina rice is another world.'),
  (3,  'Bacon''s Rebellion, 1676',
       'Nathaniel Bacon vs Gov. Berkeley: frontier settlers, some servants and enslaved people, war on Native nations, burn Jamestown. Aftermath: elites invest more in racial slavery and a color line to split poor whites from Blacks. 7A: historians argue how much this "causes" racial slavery (it was already underway). Use it as a window on land, labor, and Native dispossession together.'),
  (4,  'slave codes and race-making',
       'Late-1600s/early-1700s statutes: lifetime servitude, status follows the mother, limits on manumission, bans on interracial marriage, separate punishments. 7A: law makes "Black" and "white" into heritable political categories. Theme 1 is happening in court, not in nature. Compare Barbados codes — Virginia copies the islands.'),
  (5,  'South Carolina and rice',
       'Settled heavily from Barbados. Rice and later indigo; task system in some places; West African knowledge of rice ecology. Black majority in the Lowcountry. 7A: this is the most Caribbean mainland colony. Stono Rebellion 1739 (next section''s crisis) grows from this majority. "American slavery" is regional, not one plantation stereotype.'),
  (6,  'Middle colonies',
       'New York (conquered Dutch), Pennsylvania (Penn, Quakers, relatively negotiated Native purchase that still displaces), pluralism, wheat exports. Slavery in NY City and farms. 7A: diversity is not equality. Quaker pacifism and later antislavery sit beside land deals that push Lenape west. Useful contrast with New England orthodoxy and Carolina rice.'),
  (7,  'women''s legal and labor lives',
       'Coverture: married English women''s legal identity folded into the husband''s. Widows might control property. Native and African women''s labor (fields, markets, reproduction under slavery) is the economy. 7A: "colonial women" is not one experience. An ID on coverture should mention who it did not cover (femes sole, enslaved women with no coverture rights).'),
  (8,  'Atlantic creoles and African diversity',
       'Captives from many African societies (Kongo, Igbo, Akan, etc.); some Atlantic creoles already knew Portuguese/Christianity. 7A: "Africans" become African Americans over generations in America — language, kin, Christianity, Islam remnants, work skills. Theme 1 again: a people is made, not shipped as a finished identity.'),
  (9,  'mercantilism and Navigation Acts',
       'English empire wants colonies to serve the metropole: enumerated goods, English ships. Smuggling is normal. 7A: colonists are Britons with imperial grievances long before 1765. The 18th-century consumer revolution (tea, cloth) will make taxes explosive. Henkin later cares about stuff and communication; start noticing goods.'),
  (10, 'Glorious Revolution in America',
       '1688-89: James II falls; Dominion of New England collapses; Maryland Protestants revolt. 7A: colonial politics are English politics. "English liberties" become a language colonists will later turn against Parliament — the irony of 1776 starts as imperial subjecthood.'),
  (11, 'witchcraft, Salem, 1692 (use carefully)',
       'Salem: accusers, spectral evidence, executions, then backlash. 7A: useful for gender, frontier war anxiety (Maine refugees), and Puritan community — not a Halloween unit. Compare to European witch trials: this is late and local. Do not let Salem eat the century.'),
  (12, 'by 1750: three slaveries, one empire',
       'Chesapeake tobacco slavery, Lowcountry rice slavery, Northern urban/rural slavery plus the Caribbean engine. 7A: "the North was free" is a 19th-century story, not a 1750 map. New England merchants finance the trade. Theme 2: prosperity and assemblies grow with unfree labor.'),
  (13, 'APUSH vs 7A on regions',
       'APUSH: New England / Middle / Southern chart. 7A: add the Caribbean as the fourth region that explains the other three. Race is a process (codes, rebellion, sex laws), not a column in a chart. King Philip''s War and Bacon should be IDs with Native land in the sentence.'),
  (14, 'colonies exam move',
       'Compare two regions on labor, religion, and Native war. Bacon: land plus labor plus race. Winthrop: covenant, not Jefferson. Carolina: Barbados in North America. Always say who is unfree. If they ask "origins of slavery," give a process (1600s laws, Caribbean, staple crops), not a single year.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 4. Eighteenth-Century Empire and Crisis
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'empire'
CROSS JOIN (VALUES
  (0,  'consumer revolution and Anglicization',
       'Colonists buy British goods, read British news, drink tea, wear imported cloth — they become more English even as they grow distinct. 7A/Henkin flavor: everyday objects and print make an imperial public. That is why a stamp on paper and a tax on tea feel like attacks on identity, not just on wallets.'),
  (1,  'Great Awakening',
       '1730s-40s transatlantic evangelical revivals (Edwards, Whitefield): new birth, itinerancy, challenge to established clergy. Splits Old Lights/New Lights. 7A: religion as a public, emotional, and sometimes leveling force — and a problem for authority. Enslaved and free Black Christians, Native converts: conversion is not the same as freedom. Connect to later evangelical abolition and proslavery Christianity.'),
  (2,  'Enlightenment in the colonies (light)',
       'Reason, natural rights, print, scientific clubs — a thin elite language that will mix with evangelical and English-liberties talk in the 1760s. 7A: Jefferson''s later prose is not the only Revolutionary language. Most people met politics in sermons, taverns, and crowd actions.'),
  (3,  'Seven Years'' War / French and Indian War',
       '1754-63, global war. North America: British and colonists vs French and many Native allies. British win Canada and claims to the Ohio country. 7A: Native nations are diplomats and fighters, not a backdrop. Pontiac''s War 1763: Native coalition against British posts after France leaves. Empire is expensive — hence new taxes.'),
  (4,  'Proclamation of 1763',
       'British line limiting settlement west of the Appalachians (on paper) to reduce Native war and control land speculation. Colonists hate it as a block on the land hunger that is already the colonial economy. 7A theme 2: the imperial crisis is about land as much as stamps. The line is leaky; speculators and settlers keep going.'),
  (5,  'Stamp Act, 1765, and the first crisis',
       'Internal tax on paper (newspapers, legal docs, cards). Colonial assemblies, crowds, Sons of Liberty, nonimportation. Repeal plus Declaratory Act (Parliament still sovereign). 7A: "no taxation without representation" is real and also a claim by slaveholding assemblies. Print culture (Henkin''s later world) is already the battlefield.'),
  (6,  'Townshend, Boston Massacre, Tea, Coercive Acts',
       'Townshend duties; 1770 Boston Massacre (crowd, soldiers, propaganda by Paul Revere). 1773 Tea Act / Tea Party; 1774 Coercive/Intolerable Acts close Boston''s port and alter Massachusetts government. First Continental Congress. 7A: a sequence of imperial reform and colonial resistance, not a sudden 1776 idea. Name the Acts as IDs with a consequence.'),
  (7,  'Common Sense and Declaration (setup)',
       'Paine, Jan 1776: attack monarchy in plain style, huge circulation. Declaration, July 1776: natural rights and a list of royal abuses; "all men" written by a slaveholder; deleted clause on the slave trade. 7A: the document is a source with silences. Theme 2: a republic announced inside a slave society. Use the text, do not recite it from memory as patriotism.'),
  (8,  'who is "the people" in 1765-76',
       'Property-holding white men in crowds and committees; sailors and artisans in waterfront riots; women in boycotts (homespun); enslaved people listening for opportunity; Native nations choosing sides. 7A: independence is not a unanimous "us." Loyalists will be a large minority. If your Revolution has no losers, it is a pageant.'),
  (9,  'Stono Rebellion, 1739, and fear',
       'South Carolina: enslaved people seize weapons, march toward (Spanish) Florida, crushed. Harsher codes follow. 7A: the 18th-century Lowcountry lives in fear of majority revolt. Spanish Florida as a rival sanctuary (Fort Mose). Connect later to Dunmore and to Haiti: Black political action is Atlantic, not only 1863.'),
  (10, 'New York conspiracy scare, 1741',
       'Fires, torture, executions of enslaved people and poor whites — a panic about arson and revolt. 7A: Northern slavery plus fear. Useful ID for "slavery was Southern" myths. Evidence problem: confessions under torture. Method card as much as event card.'),
  (11, 'Ohio country as the war''s prize',
       'Virginia speculators (including Washington''s world), Native confederacies, French forts: 1754 starts here. 7A: the Revolution''s western problem is born in this war. After 1783 the United States wants the land Britain claimed and Native nations still inhabit. Continuity: 1763 to 1815 is one western story.'),
  (12, 'salutary neglect (use then complicate)',
       'Loose imperial enforcement before the 1760s, then a crackdown. 7A: handy lecture phrase, but smuggling and assembly power were always political. Do not treat 1763 as the moment colonists suddenly cared about liberty. They cared about land, debt, and local control all along.'),
  (13, 'APUSH vs 7A on causes of revolution',
       'APUSH: end of salutary neglect, taxes, Enlightenment. 7A: add Pontiac, Proclamation, slaveholder assemblies, print, and a global war debt. The Revolution is an imperial civil war with Native and Black theaters. "Freedom" as a word is fought over, not discovered.'),
  (14, 'empire exam move',
       'Start in 1763: debt, Proclamation, Pontiac. Then Stamp to Coercive as a chain. Always add who is left out of "the people." Stono/1741 if the question is slavery and empire. For a document (Revere engraving, Paine, a sermon): propaganda with an audience. Hitch to theme 2: liberty talk plus land and labor.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 5. Independence and Revolutionary War
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'revolution'
CROSS JOIN (VALUES
  (0,  'a civil war inside an empire',
       'Patriots vs Loyalists vs neutrals; British regulars and Hessian hirelings; French alliance after Saratoga. 7A: not thirteen united "Americans" vs aliens. Neighbors punish neighbors. Confiscated Loyalist property funds the cause. If you only narrate Washington''s battles, you are doing military history without politics.'),
  (1,  'Dunmore''s Proclamation, 1775',
       'Virginia''s royal governor offers freedom to enslaved people who join the British. Thousands flee to British lines over the war (not only Dunmore). 7A: the Revolution is an emancipation event for some, a slaveholders'' independence for others. Theme 1 and 2 collide. Patriot leaders call this a crime; the enslaved call it an opening.'),
  (2,  'Black Patriots and the northern gradualisms',
       'Some Black men serve in Continental and militia units (especially New England). After the war, Northern states begin gradual emancipation (Pennsylvania 1780, etc.) — slow, property-protecting, not 1865. 7A: "the Revolution freed the North" is too clean. Slavery dies slowly; racism does not. South doubles down.'),
  (3,  'Native nations and the war',
       'Haudenosaunee split (Oneida/Tuscarora often Patriot-leaning; Mohawk/Seneca/Cayuga/Onondaga often British). Cherokee and others fight expansion. 1783 Treaty of Paris gives the US land Native nations did not cede. 7A: independence is a catastrophe for many Native polities. Theme 2: the new republic''s land is a diplomatic lie plus later war.'),
  (4,  'women in the war',
       'Camp followers, boycotts, farm management, fundraising, some political writing (Abigail Adams "remember the ladies" — a letter, not a statute). 7A: republican motherhood (raise virtuous sons) is the postwar consolation prize, not suffrage. Coverture remains. Use Adams as a source with a limited ask, not as proto-Seneca Falls without a gap.'),
  (5,  'republicanism as 1770s politics',
       'Virtue, corruption, mixed government, fear of standing armies and luxury — an English opposition language. 7A: it can support a republic of slaveholders. "We the people" will be defined narrowly. Do not equate republicanism with later democracy (that fight is Jacksonian).'),
  (6,  'Declaration as a source (again, with teeth)',
       'Grievances against the king; equality language; silence on Native land and on slavery (the deleted slave-trade clause). 7A: later movements (abolition, women''s rights, Civil Rights) quote it against the founders'' practice. That is resonance. The 1776 authors did not intend those movements. Hold the tension; do not "gotcha" or "hagiography."'),
  (7,  'Saratoga, French alliance, Yorktown',
       '1777 Saratoga convinces France; 1781 Yorktown with French navy. 7A: the United States does not win alone. Global war: Caribbean, Europe, India. Peace 1783: independence plus western lands on paper. British remain in some posts; Native war continues. Military IDs only matter if you attach a political result.'),
  (8,  'Articles of Confederation (preview)',
       'Loose league, weak Congress, no independent executive, hard to tax. Western land cessions by states. 7A: this is the first US constitution. Its "failures" (from nationalist view) are features for people who feared distant power. Shays'' Rebellion will scare elites into Philadelphia (next section).'),
  (9,  'Loyalist diaspora',
       'Tens of thousands leave for Canada, Britain, Caribbean — including Black Loyalists, some later to Sierra Leone, many betrayed into slavery again. 7A: the Revolution produces refugees. Canadian history is partly this exodus. An ID that only says "Tories were traitors" is a Patriot sermon, not analysis.'),
  (10, 'slavery and the new state constitutions',
       'Some Northern gradual emancipation; VA/MD manumission waves then backlash; Deep South rice/cotton future. Vermont''s 1777 constitution attacks slavery. 7A: the Revolution is a fork, not a national abolition. Theme 2: liberty constitutions and slave codes in the same decade.'),
  (11, 'why 1776 is not the end of 7A',
       'Independence creates a problem: how to govern a huge, slaveholding, expansionist republic among Native nations and Atlantic empires. 7A still has half the course. If a midterm stops at Yorktown, the final will punish you for forgetting cotton and 1861.'),
  (12, 'memory vs history (Henkin)',
       'Fourth of July pageants, founding-father biographies, and 7A lecture are different genres. 7A: you can respect a source''s power (the Declaration) and still historicize it. Exam essays that only morale-boost fail. Exam essays that only denounce also fail if they skip how institutions actually changed.'),
  (13, 'APUSH vs 7A on the Revolution',
       'APUSH: causes, turning points, Treaty of Paris terms. 7A: Dunmore, Native diplomacy, Loyalists, gradual emancipation, and the land theft in the peace treaty. Battles are supporting evidence. If they want "republican motherhood," define it as a limit as well as a role.'),
  (14, 'Revolution exam move',
       'Call it an imperial civil war. Give one Patriot, one Loyalist, one Native, one Black trajectory. Dunmore and Paris 1783 (Native land) are high-value IDs. Declaration: quote a silence. Connect to theme 2: a republic born in slavery and expansion. Do not list every battle.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 6. Constitution and the Early Republic
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'republic'
CROSS JOIN (VALUES
  (0,  'Shays'' Rebellion, 1786-87',
       'Western Massachusetts farmers, debt and taxes, close courts; crushed. Nationalists use it to argue the Articles cannot keep order. 7A: elite fear of democracy. Whether Shays "causes" the Constitution is argued; it is in every Federalist story. Theme 2: who counts as the people when debtors take up arms.'),
  (1,  'Philadelphia 1787: a slaveholding document',
       'New constitution: stronger federal government, commerce power, House by population. Three-fifths clause (counts enslaved people for representation and taxes without giving them votes). Fugitive slave clause. Slave trade may be banned after 1808 (and is). 7A: you cannot teach "the Constitution" without these clauses. Democracy for some is built on counting others as property-plus-population.'),
  (2,  'Federalists vs Anti-Federalists',
       'Federalists (Hamilton, Madison as Publius): extended republic, energy in government. Anti-Federalists: consolidation, missing bill of rights, distant elites. Ratification as a political fight, not a unanimous founding. 7A: Bill of Rights is a concession (1791). "Original intent" is multiple intents. Madison later opposes Hamilton — factions start immediately.'),
  (3,  'Hamilton''s program and the first party system',
       'Debt assumption, national bank, tariff, close to British finance. Jefferson/Madison: agrarian, strict construction, sympathy for France. 1790s newspapers and vitriol. 7A: parties were supposed to be corruption; they become the system. Henkin-relevant: a print public sphere. Alien and Sedition Acts 1798: speech and immigrants as threats.'),
  (4,  'Haitian Revolution, 1791-1804',
       'Enslaved people in Saint-Domingue destroy the richest slave colony, defeat European armies, create Haiti. Refugees and panic in the US South; inspiration for the enslaved; Jeffersonian fear. 7A: the Atlantic''s other revolution. US policy is hostile and isolationist toward Black republic. Theme 1: African-descended people as state-makers, not only victims.'),
  (5,  'Revolution of 1800',
       'Jefferson beats Adams; peaceful transfer between parties (after a House mess). 7A: a big deal for a new republic, not "democracy completed." Jefferson the slaveholder expands the empire (Louisiana) and the embargo. Sally Hemings is part of the household and the evidence problem of founding intimacy and exploitation.'),
  (6,  'Louisiana Purchase, 1803',
       'Napoleon sells after Haiti wrecks his American plans. Doubles claimed US territory; Native nations not consulted; slavery''s expansion becomes the 19th-century bomb (Missouri). 7A: Jefferson the strict constructionist does a loose thing. Theme 2: land acquisition as the republic''s habit. Lewis and Clark is a military-diplomatic expedition, not a camping trip.'),
  (7,  'Gabriel''s Rebellion, 1800',
       'Enslaved blacksmith in Richmond plans a revolt; betrayed and hanged. 7A: Virginia after the Revolution is not softening forever. Pair with Haiti: information travels. Southern law hardens. An ID that only says "failed slave revolt" misses the political literacy of the plotters.'),
  (8,  'War of 1812',
       'Impressment, western Native resistance (Tecumseh, Tenskwatawa), Canada invasion fails, DC burned, New Orleans Jackson (after peace). Treaty of Ghent mostly status quo. 7A: Native defeat in the Old Northwest is a main result. "Second war of independence" is a nationalist memory. Canada remains British.'),
  (9,  'Tecumseh and the western war',
       'Shawnee leadership of a multi-tribal confederacy; reject piecemeal land cessions. Defeat and death in the 1812 war. 7A: Native politics as international. US "pioneers" are moving into someone else''s alliance system. Removal later is easier after this military crushing.'),
  (10, 'cotton gin and the fork not taken',
       'Whitney 1793 (and enslaved people''s labor knowledge): short-staple cotton profitable inland. Northern textile mills and Southern expansion lock together. 7A: the early republic could have seen slavery as dying in the Chesapeake; cotton revives and spreads it. Theme 2 becomes the 19th-century plot.'),
  (11, '1808 slave-trade ban',
       'Congress bans the international trade; domestic trade explodes (Second Middle Passage later). Smuggling continues. 7A: a humanitarian-sounding federal law that leaves slavery itself intact and makes enslaved people in the Upper South more valuable as a "surplus" to sell southwest. Do not call it abolition.'),
  (12, 'women, religion, print in the early republic',
       'Disestablishment, proliferating denominations, female literacy, novels and newspapers. 7A/Henkin: the US becomes a society of readers and, later, a postal public. Republican mothers and church ladies are political without votes. This is setup for abolitionist print and the penny press.'),
  (13, 'APUSH vs 7A on the Constitution',
       'APUSH: compromises, Federalist 10, Bill of Rights list. 7A: three-fifths and fugitive slave as load-bearing, Haiti as the era''s earthquake, Native land as the Purchase''s secret. 1800 is a party story and a slavery story (Gabriel). If they want Hamilton vs Jefferson, add who is enslaved on their plantations.'),
  (14, 'early-republic exam move',
       'Constitution: energy plus slavery clauses. 1790s: parties and Sedition. Haiti + Gabriel + cotton gin = why slavery does not fade. Louisiana: land without Native consent. 1812: Tecumseh. Theme 2 on every essay. Do not stop at "peaceful transfer of 1800" as if the course ended.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 7. Market Revolution, Democracy, Removal
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'market'
CROSS JOIN (VALUES
  (0,  'market revolution',
       'Roads, canals (Erie 1825), steamboats, later railroads; more people sell to distant markets; clock time, wages, and store-bought goods spread. 7A/Henkin: this is his century — mail, newspapers, urban streets, the week as a rhythm. It is not "progress" only: panic of 1819 and 1837, child labor, enslaved people as the most valuable "commodity" in the South.'),
  (1,  'Missouri Compromise, 1820',
       'Missouri slave, Maine free, 36°30 line in the Louisiana Purchase (except Missouri). Jefferson''s "fire bell in the night." 7A: the first big congressional crack over slavery in the territories. It lasts until Kansas-Nebraska. Theme 2: the Union''s peace is a map that treats people as a line on land.'),
  (2,  'Jacksonian democracy — who got the vote',
       'Many states drop property requirements for white men; turnout soars; parties as machines (spoils). 7A: this is not universal democracy. Women, Native peoples, free Blacks (often losing rights), and the enslaved are out. "The people" narrows racially as it widens among white men. Pair with Indian Removal: more voters, more pressure for land.'),
  (3,  'Indian Removal Act, 1830, and the Trail of Tears',
       'Jackson (and then Van Buren): federal policy to push southeastern nations west of the Mississippi. Cherokee: literacy, constitution, Worcester v. Georgia (ignored). Forced marches, thousands dead (Cherokee 1838-39 and others: Creek, Choctaw, Chickasaw, Seminole wars). 7A theme 2 in its rawest form: democracy for white settlers funded by ethnic cleansing. Do not say "relocation" as if it were a moving van.'),
  (4,  'Marshall Court and Native sovereignty (the gap)',
       'Cherokee Nation v. Georgia (domestic dependent nations); Worcester v. Georgia (states cannot impose on Cherokee country). Jackson''s supposed "Marshall has made his decision" line is half legend; the enforcement failure is real. 7A: law can recognize Native polities and still lose to settlers and the army. Use as a document set on sovereignty.'),
  (5,  'Bank War and political style',
       'Jackson vs Biddle''s Second Bank; veto; pet banks; then panic. 7A: this is white-male democracy as culture (campaigns, nicknames, duels) as much as finance. You need it as an ID; do not let it crowd out Removal. Both are Jackson.'),
  (6,  'separate spheres and the industrial North',
       'Middle-class ideology: men in market, women in home — while working-class women and children fill mills (Lowell). 7A: an ideology, not a description of most women''s work. Enslaved women have no "sphere." The mill girl and the plantation cook are in one Atlantic cotton circuit.'),
  (7,  'Second Great Awakening',
       'Frontier and urban revivals, Methodists/Baptists explode, voluntary societies. Fuels reform (temperance, abolition, women''s activism) and also proslavery evangelicalism in the South. 7A: religion is not a side unit. It is how many Americans explain the market''s chaos and slavery''s sin or its "duty."'),
  (8,  'cotton kingdom geography',
       'After gin and Indian Removal, cotton spreads through Alabama, Mississippi, Louisiana, Texas. New Orleans as a slave-market city. 7A: the "Southwest" of the 1830s is a slave frontier. Northern banks and English mills eat the cotton. An ID on the cotton kingdom should name forced Native removal as the land-clearing.'),
  (9,  'Second Middle Passage',
       'About a million enslaved people sold from the Upper South to the Lower South in the domestic trade (roughly 1790-1860, peaking antebellum). Families broken in Richmond, Baltimore, the coastal trade. 7A: this is the central Black experience of the era, larger in numbers than the colonial Middle Passage into what became the US. Theme 1: African America remade on the cotton frontier.'),
  (10, 'whiteness as a political project',
       'Irish and other immigrants: not automatically "white" in the 1830s-50s; parties and riots (nativism later) negotiate it. Free Blacks lose the vote in some Northern states as white manhood suffrage spreads. 7A: race is rebuilt in the age of democracy. Theme 1 is still happening in the 19th century, not only in 1619.'),
  (11, 'nullification, 1832-33',
       'South Carolina vs the tariff; Calhoun''s theory; Jackson threatens force; compromise tariff. 7A: a dress rehearsal for secession language, nominally about the tariff, haunted by slavery. Unionism of Jackson the remover: he will crush a state and also crush Native nations.'),
  (12, 'Henkin''s 19th century (use as spice, not the meal)',
       'Cheap postage, newspapers, clocks, the seven-day week, city walking and signs: a new felt time and public. 7A: this helps explain mass politics and later war mobilization (people who share news). Do not write a final only about stamps. Connect communication to parties, markets, and reform.'),
  (13, 'APUSH vs 7A on Jackson',
       'APUSH: common man, Bank, spoils, maybe Removal as a bullet. 7A: Removal is the center of Jacksonian democracy, not a regrettable extra. Cotton + Second Middle Passage + democracy for white men is one system. Missouri is the territorial fuse.'),
  (14, 'market exam move',
       'Define market revolution with a technology and a loser (panic, mill child, sold enslaved person). Jackson: suffrage plus Removal in the same paragraph. Missouri 1820 as the map of future war. Second Middle Passage as the ID too many students skip. Theme 2: more voters, more cotton, more stolen land.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 8. Cotton Kingdom, Reform, Abolition
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'slavery'
CROSS JOIN (VALUES
  (0,  'slavery as a labor and a political system',
       'Not just plantations: urban enslaved people, hiring out, law, patrols, the Constitution''s clauses, the gag rule in Congress. 7A: "the South" is diverse (yeomen, poor whites, big planters) but the slaveholding class dominates politics. Paternalist ideology vs the evidence of the whip and the market in people. Use a document (ad for a runaway, a planter''s diary) against the ideology.'),
  (1,  'everyday resistance and revolt',
       'Work slowdowns, breaking tools, flight (North, maroon, cities), maintaining kin. Nat Turner, 1831 Virginia: uprising, killings, massive white retaliation and tighter laws, chill on Southern antislavery talk. 7A: agency without romanticizing odds. Pair Turner with Haiti in the white Southern imagination.'),
  (2,  'proslavery argument',
       'After 1830: slavery as a "positive good" (Calhoun), biblical justifications, racial science, claim that wage labor is worse. 7A: this is modern and aggressive, not leftover colonial habit. It is a response to abolitionists and to cotton profits. Democracy for white men plus slavery as the "cornerstone" (later Stephens) is the sectional ideology.'),
  (3,  'abolitionism vs "antislavery"',
       'Garrison: immediate, moral, uncompromising, sometimes disunionist, The Liberator 1831. Douglass: fugitive, orator, later politics and the Constitution as usable. Free Soil / later Republicans: stop expansion, not always racial equality. 7A: do not mash these together. Many Northerners hate the Slave Power and still hate Black neighbors. Theme 1: who counts as American in abolitionist print.'),
  (4,  'women''s rights and abolition together',
       'Women in petition campaigns and as speakers (Grimké sisters) hit a wall of "public woman" panic; Seneca Falls 1848, Declaration of Sentiments (parodies 1776). 7A: the two movements split as well as overlap (15th Amendment fights are 7B, but the tension starts here). Use 1848 as an ID with the Declaration echo — resonance, not sameness.'),
  (5,  'free Black life in the North',
       'Churches, newspapers, mutual aid, legal discrimination, kidnapping risk under fugitive law. 7A: "the North" is not Canaan. Colonization (ACS, Liberia) is a white project many Black activists reject. Urban riots (Cincinnati, Philadelphia) show Northern race-making.'),
  (6,  'gag rule and the Slave Power',
       'House 1836-44: table antislavery petitions without debate. 7A: Southern power in federal institutions (three-fifths helps). Northerners who are not Garrisonians still get angry at being silenced. This is how a sectional political identity forms before Kansas.'),
  (7,  'Texas and the problem of expansion (preview)',
       'Anglo colonization of Mexican Texas, slavery, 1836 rebellion, delayed annexation because of slavery politics, 1845. 7A: Mexico abolished slavery; Texas independence is a slavery story as well as a borderlands story. Native nations (Comanche power) are players, not scenery. Sets up 1846.'),
  (8,  'religion, reform, and control',
       'Temperance, asylums, schools, anti-Catholic nativism: the same "improve society" energy as abolition, not always humane. 7A: reform is about who has the power to define the good life (Henkin''s course language). A temperance pledge and a plantation mission can both be "reform."'),
  (9,  'planter households and enslaved women',
       'Sexual violence, reproduction as profit (after 1808 especially), kitchen and field labor, market women in cities. 7A: gender is not a Northern mill-girl-only topic. Historians (including Berkeley''s Jones-Rogers on women slaveholders — not the FA26 lecturer, but the field) stress that white women could be investors and managers in slavery. Do not reduce enslaved women to "also there."'),
  (10, 'literacy, the mail, and forbidden news',
       'Southern bans on teaching enslaved people to read; panic about abolitionist pamphlets in the mail (1835). 7A/Henkin: the postal public is national and therefore dangerous to slaveholders. Abolition is a media war. Connect to later telegraph and war news.'),
  (11, 'Amistad and the legal Atlantic (light)',
       '1839 revolt, US courts, 1841 Supreme Court frees the Mende (narrow, on illegal trade). 7A: international law and slavery; a limited Northern legal win that does not dent the domestic trade. Good document case if it appears in a packet; do not over-weight it as "America choosing freedom."'),
  (12, 'yeoman whites and slavery''s hegemony',
       'Most Southern whites do not own enslaved people; many still support the system (race, militia, markets, honor, hope of buying in). 7A: "only planters wanted the war" is too simple. Also: poor whites are not a monolith. Class and race together, not class instead of race.'),
  (13, 'APUSH vs 7A on reform',
       'APUSH: reform buffet (schools, prisons, Seneca Falls, Garrison). 7A: put cotton and the Second Middle Passage in the middle of the plate; reform is a reaction to that world. Distinguishing immediate abolition from Free Soil is a 7A exam favorite. Turner 1831 as a hinge year with The Liberator.'),
  (14, 'slavery exam move',
       'Define the cotton complex (land, trade in people, mills, law). Give resistance and ideology as a pair. Split Garrison / Douglass / Free Soil. Seneca Falls as 1776 reused. Gag rule as Slave Power. Do not write "slavery was cruel" without an institution (patrol, market, Constitution). Theme 1: Black political and religious life under and against slavery.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 9. Expansion and the Sectional Crisis
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'crisis'
CROSS JOIN (VALUES
  (0,  'Mexican-American War, 1846-48',
       'Polk, disputed border, invasion of Mexico, US wins huge cession (California, Southwest). Thoreau''s protest, Lincoln''s spot resolutions, desertion and volunteer politics. 7A: an expansionist war that immediately becomes a slavery-in-the-territories war (Wilmot Proviso). Native peoples and Mexican citizens in the cession are the conquered. Theme 2 at continental scale.'),
  (1,  'Wilmot Proviso and Free Soil',
       '1846 attempt to ban slavery in any Mexican cession land — fails in the Senate, organizes a Northern bloc. Free Soil Party 1848: "free soil, free speech, free labor, free men" — often white-men''s anti-expansion, not racial equality. 7A: the crisis is about the West as much as about plantations in Georgia. Name Wilmot as an ID with that distinction.'),
  (2,  'Compromise of 1850',
       'California free state, Texas border/debt, New Mexico/Utah popular sovereignty, slave trade banned in DC (not slavery), Fugitive Slave Act strengthened. 7A: the fugitive law is the poison pill — Northern streets become hunting grounds, personal liberty laws, rescues, Black flight to Canada. Henkin''s national print/post now carries wanted ads and protest.'),
  (3,  'Fugitive Slave Act politics',
       'Federal commissioners, no jury for the accused, Northerners can be deputized. Cases like Anthony Burns (Boston 1854) radicalize people who ignored plantation slavery. 7A: "the South imposed on the North" is how many Northern whites experience the 1850s — still not the same as Black experience of kidnapping. Theme 2: a democracy that hunts people.'),
  (4,  'Kansas-Nebraska Act, 1854',
       'Douglas, transcontinental railroad, popular sovereignty in Kansas and Nebraska, repeal of the Missouri 36°30 line. Whig Party wrecked; Republican Party born. 7A: the map of 1820 dies. "Let the people decide" in a territory means armed people decide. Bleeding Kansas follows.'),
  (5,  'Bleeding Kansas and the caning of Sumner',
       'Proslavery and free-soil settlers, two governments, violence (including John Brown at Pottawatomie). 1856 Brooks canes Sumner in the Senate after an antislavery speech. 7A: the national legislature becomes a brawl. Newspapers make celebrities of martyrs. Democracy looks like civil war already.'),
  (6,  'Dred Scott v. Sandford, 1857',
       'Taney: African Americans cannot be citizens; Congress cannot ban slavery in territories (Missouri Compromise unconstitutional). 7A: the Supreme Court tries to end the territorial debate and instead blows it open. Republicans reject it. Theme 1: the Court writes a racial origin story into law. An ID must include citizenship, not only "Scott stays enslaved."'),
  (7,  'Lincoln-Douglas debates, 1858',
       'Illinois Senate: popular sovereignty vs a house divided / stop spread of slavery. Lincoln is not an abolitionist here; he is a Free Soil Republican who talks about a white man''s country and also about a moral wrong. 7A: use the texts. Do not baptize 1858 Lincoln as 1863 Lincoln. Douglas paints him as an equality radical to scare voters.'),
  (8,  'John Brown, 1859',
       'Harpers Ferry raid to spark a slave uprising; captured, hanged. Northern transcendentalist praise vs Southern proof of abolitionist terrorism. 7A: a polarizing ID. Brown had been in Kansas. Whether he is a terrorist or a prophet depends on the source set — say that. He fails militarily and succeeds as a symbol.'),
  (9,  'election of 1860 and secession',
       'Lincoln wins with no Southern electoral votes (four-way race: Lincoln, Douglas, Breckinridge, Bell). Lower South secedes, then after Sumter the Upper South split. 7A: secession documents name slavery (not a vague "tariff"). Cornerstone Speech (Stephens): the Confederacy is built on racial slavery. Unionists in Tennessee/Virginia exist — it is not magic unanimity.'),
  (10, 'why "states'' rights" is a bad 7A slogan',
       'Confederates used the phrase and also demanded a federal fugitive slave policy that overrode Northern states. 7A: follow the power. When they wanted a right, it was the right to hold and recover enslaved people. An essay that says "the war was about states'' rights" without saying rights to do what will be marked as evasion.'),
  (11,  'Compromise that could not come back',
       'Crittenden and other last-ditch deals fail. 7A: 1820 and 1850 were possible when both sections still thought they could win the West. After Dred Scott, a Republican victory, and a cotton kingdom sure of itself, the old map-making peace dies. Structural, not just "hotheads."'),
  (12, 'California, gold, and a free-state shock',
       '1848 gold rush: sudden non-Native population, Native dispossession and killing in California, 1850 free-state admission. 7A: the Pacific is in this course. Mexican War plus gold upends the Senate math. Indigenous California is a 7A Removal/genocide story too often skipped for Kansas.'),
  (13, 'APUSH vs 7A on the 1850s',
       'APUSH: compromise scorecard, then Lincoln. 7A: Fugitive Slave Act as Northern lived experience, Dred Scott as racial citizenship, secession as a slavery project. Mexican War as the start, not a foreign-policy sidebar. If they want "popular sovereignty," say it was violence.'),
  (14, 'crisis exam move',
       'Chain: Mexico → Wilmot → 1850/Fugitive Act → Kansas-Nebraska → Dred Scott → 1860. Give one Northern white path (Burns) and the Black path (flight, citizenship denied). Quote a secession document or Stephens on slavery. Theme 2: democratic mechanisms (elections, courts, popular sovereignty) produce a war over property in people and land.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

-- =====================================================================
-- 10. Civil War and Emancipation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'civilwar'
CROSS JOIN (VALUES
  (0,  'the war the catalog ends with',
       '7A stops at the end of the Civil War (some 7A years dip into Reconstruction; FA26 catalog says end of the Civil War). 7B is the sequel and is not in the picker. 7A: you still need 1861-65 as argument, not a battle list. The question is how a war for Union became a war against slavery — and what that did not solve (land, votes, racial violence).'),
  (1,  'Fort Sumter to a mass war',
       'April 1861, Lincoln calls 75,000 militia, Upper South secedes, both sides volunteer. 7A: nobody planned 750,000 dead. Democratic mobilization (parties, press, railroads, the market revolution''s logistics) makes a huge war possible. Henkin''s connected public now reads casualty lists.'),
  (2,  'Confederacy as a slaveholders'' state',
       'Constitution protects slavery; no banning it. Davis, Stephens, conscription, later desperate debates about arming enslaved men. 7A: this is not "agrarian localism" only. It is a modern state fighting for a property system. Internal dissent (West Virginia, desertion, food riots) matters.'),
  (3,  'United States war aims, 1861-62',
       'Lincoln: preserve the Union; early war not a crusade to abolish. Contraband policy (Butler): enslaved people who reach US lines as seized enemy property — a legal crack. 7A: enslaved people force the issue by fleeing to the army. Self-emancipation is a 7A keyword. Congress''s confiscation acts inch forward.'),
  (4,  'Emancipation Proclamation, 1863',
       'Jan 1, 1863: frees enslaved people in states in rebellion (not the loyal Border States), authorized as war power, invites Black enlistment. 7A: a document with limits and world-historical effects. It does not "Lincoln frees the slaves" by itself — it aligns the US government with a process already underway and makes abolition a Union war aim. Use the text''s geography.'),
  (5,  'Black soldiers and the meaning of citizenship',
       'US Colored Troops, unequal pay until later, Fort Wagner in memory, massacres of Black prisoners (Fort Pillow). 7A theme 1: African Americans as a people making a military claim on the republic. 1865 debates about voting start here. Do not treat Black troops as a diversity footnote; they are a political revolution in uniform.'),
  (6,  'Gettysburg Address and wartime nationalism',
       'Nov 1863: Lincoln re-founds the war on 1776 equality language — a 7A resonance move. 7A: this is wartime rhetoric, not a description of 1776 practice. Compare to the Declaration silences you already know. Nationalism is being rewritten under fire.'),
  (7,  'home fronts: draft, dissent, gender',
       'NYC draft riots 1863: class, racism, attacks on Black New Yorkers. Confederate bread riots. Women run farms and spy. 7A: the war is not only Virginia. Copperheads, habeas corpus, and "hard war" (Sherman) are IDs with a social history. Democracy at war suspends and strains itself.'),
  (8,  'Native peoples in the Civil War',
       'Some Indian Territory nations split (slaveholding Cherokee elites, etc.); Minnesota 1862 Dakota war and mass execution; Navajo Long Walk. 7A: the Union fights a war for itself and continues a war on Native nations. Do not let Appomattox erase the West. Theme 2 does not pause in 1861.'),
  (9,  'why the Union wins (7A-sized)',
       'Population, industry, railroads, navy, the blockade, and the political decision to smash slavery (which wrecks the Confederate labor system). 7A: not "North had factories" as a one-liner without emancipation and the enslaved. Confederate hopes in cotton diplomacy fail (Britain does not intervene). Grant/Sherman as a strategy of exhaustion.'),
  (10, 'Appomattox and the 13th Amendment, 1865',
       'April 1865: Lee surrenders; Lincoln assassinated days later. 13th Amendment abolishes slavery (except as punishment for crime — a clause with a long afterlife, mostly 7B). 7A: legal slavery as a property system ends. Land, suffrage, and white terror are unfinished. If the prompt stops in 1865, say what is settled and what is not.'),
  (11, 'what "freedom" did and did not mean in 1865',
       'Freedpeople seek family, wages or land, churches, schools. Many planters want them back in the fields under new names. 7A: Juneteenth (Texas 1865 news of emancipation) is a useful end-date ID. Do not write "and then they were equal." That is how you get a 7B course.'),
  (12, 'memory of the war (already starting)',
       'Lost Cause will later deny slavery as the cause; Union "reconciliation" will often sideline Black freedom. 7A: you already have the secession documents. Use them against later myths. Henkin''s present-resonance: arguments about monuments and "heritage" are fights over this syllabus.'),
  (13, 'the whole 7A arc in one card',
       'Native worlds → Atlantic empires and slave labor → colonial regions → imperial crisis → a republic with slavery clauses → cotton and removal → a democratic white men''s politics that cannot contain territorial slavery → war and a legal end to property in people. Themes: peoples made in contact; democracy tangled with slavery and land. If your final has no Native history after week 2, you dropped theme 2''s land half.'),
  (14, 'Civil War exam move',
       'War aims shift: Union → emancipation as policy, driven by flight and politics. Emancipation Proclamation: limits plus enlistment. Black soldiers as citizenship claim. 13th Amendment as legal end, not social equality. One Native ID so the West is in the war. Against "states'' rights": slavery in the Confederate project. Close 7A by restating the two catalog themes, now in 1865 form.')
) AS c(pos, front, back)
WHERE d.slug = 'hist7a';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'hist7a';
