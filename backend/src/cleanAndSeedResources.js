const db = require('./models');
const LegalResource = db.LegalResource;

const LEGAL_RESOURCES = [
  // ─── LOGEMENT (الكراء والسكن) ───────────────────────────────────
  {
    title: "قانون الكراء - استرجاع مبلغ الضمان والالتزامات المشتركة (المادة 7 من القانون 67.12)",
    titleFr: "Droit du bail - Restitution du dépôt de garantie (Article 7 de la loi 67.12)",
    titleEn: "Lease Law - Security Deposit Refund & Joint Obligations (Article 7 of Law 67.12)",
    category: "logement",
    content: `تحدد المادة 7 من القانون 67.12 المتعلق بكراء المحلات المعدة للسكنى أو الاستعمال المهني مبلغ الضمانة (الكفالة) في شهر واحد بالنسبة للمحلات السكنية وشهرين للمحلات المهنية. يلتزم المكري بإرجاع مبلغ الضمان للمكتري داخل أجل شهر من تاريخ تسليم المفاتيح وإفراغ المحل، بعد خصم المبالغ الواجبة عن الأضرار الموثقة بمحضر الخروج.`,
    contentFr: `L'article 7 de la loi 67.12 fixe le montant du dépôt de garantie à un mois de loyer pour les locaux à usage d'habitation et à deux mois pour l'usage professionnel. Le bailleur est tenu de restituer la garantie dans un délai d'un mois après la remise des clés et l'évacuation des lieux, déduction faite des sommes dues au titre des dégradations constatées.`,
    contentEn: `Article 7 of Law 67.12 limits the security deposit to one month's rent for residential leases and two months for professional leases. The landlord must return the security deposit within one month from key handover and vacate date, minus any documented damage costs.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "قانون الكراء - مسطرة التماطل والإفراغ واستيفاء الوجيبة الكرائية (المادتان 23 و 24 من القانون 67.12)",
    titleFr: "Droit du bail - Procédure de défaut de paiement et d'expulsion (Articles 23 & 24 de la loi 67.12)",
    titleEn: "Lease Law - Non-Payment Notice & Eviction Procedure (Articles 23 & 24 of Law 67.12)",
    category: "logement",
    content: `بموجب المادتين 23 و24 من القانون 67.12، في حالة عدم أداء المكتري للوجيبة الكرائية، يحق للمكري توجيه إنذار بالإداء عبر مفوض قضائي يمنحه أجل 15 يوماً للتسديد. إذا لم تؤد المكتري داخل الأجل، يمكن للمكري طلب المصادقة على الإنذار والأمر بالإفراغ والاستيفاء الفوري للديون أمام رئيس المحكمة الابتدائية.`,
    contentFr: `En vertu des articles 23 et 24 de la loi 67.12, en cas de non-paiement du loyer, le bailleur peut faire sommer le locataire par huissier de justice d'avoir à payer sous 15 jours. À défaut de paiement, le bailleur peut demander l'homologation de la mise en demeure et l'expulsion immédiate devant le président du tribunal de première instance.`,
    contentEn: `Pursuant to Articles 23 & 24 of Law 67.12, if the tenant fails to pay rent, the landlord may issue a 15-day formal notice via a bailiff. If payment is not made within 15 days, the landlord may apply for eviction approval and immediate debt collection before the court president.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "قانون الكراء - إنهاء عقد الكراء السكني والإشعار بالإفراغ (المادتان 44 و 45 من القانون 67.12)",
    titleFr: "Droit du bail - Résiliation du bail d'habitation et préavis d'éviction (Articles 44 & 45 de la loi 67.12)",
    titleEn: "Lease Law - Residential Lease Termination & Notice to Vacate (Articles 44 & 45 of Law 67.12)",
    category: "logement",
    content: `تنص المادتان 44 و45 من القانون 67.12 على أنه لا ينتهي عقد الكراء إلا بتوجيه إشعار بالإفراغ مستند إلى أسباب قانونية مشروعة (كاسترجاع المحل لسكنى المكري أو فروعه المباشرين، أو الهدم وإعادة البناء). ينبغي منح المكتري أجل 3 أشهر قبل رفع دعوى المصادقة على الإشعار بالإفراغ أمام المحكمة الابتدائية.`,
    contentFr: `Les articles 44 et 45 de la loi 67.12 disposent que le bail d'habitation ne prend fin que par un préavis d'éviction fondé sur un motif légitime (reprise pour occupation personnelle/familiale ou démolition/reconstruction). Un préavis de 3 mois doit être accordé avant de saisir le tribunal.`,
    contentEn: `Articles 44 & 45 of Law 67.12 state that residential leases end only upon formal notice to vacate based on legitimate grounds (owner/family repossession or demolition/rebuilding). A 3-month notice period must be given before filing for court validation.`,
    url: "https://adala.justice.gov.ma"
  },

  // ─── FAMILLE (الأسرة) ───────────────────────────────────────────
  {
    title: "مدونة الأسرة - أحكام النفقة وأجرة الحضانة ومصاريف السكن (المادتان 168 و 188)",
    titleFr: "Code de la Famille - Pension alimentaire, garde d'enfant et logement (Articles 168 & 188)",
    titleEn: "Family Code - Alimony, Child Custody & Housing Expenses (Articles 168 & 188)",
    category: "famille",
    content: `تشمل النفقة شرعاً وقانوناً الغذاء والكسوة والعلاج والتعليم ومصاريف سكن المحضون طبقاً للمادتين 168 و188 من مدونة الأسرة. تقدر المحكمة النفقة اعتماداً على دخل الملزم بها ومستوى عيش الأسرة. إهمال أداء النفقة المحكوم بها قضائياً لمدة تفوق شهراً ونصف دون عذر مقبول يشكل جنحة إهمال الأسرة المعاقب عليها في الفصل 480 من القانون الجنائي.`,
    contentFr: `La pension alimentaire comprend la nourriture, l'habillement, les soins, l'instruction et le logement de l'enfant (articles 168 & 188 du Code de la Famille). Le tribunal l'évalue selon les revenus du débiteur. Le non-paiement pendant plus d'un mois et demi constitue un délit d'abandon de famille (article 480 du Code Pénal).`,
    contentEn: `Alimony legally includes food, clothing, medical care, education, and child housing (Articles 168 & 188 of the Family Code). Courts assess alimony based on income and family living standards. Failure to pay for over 1.5 months is penalized as family abandonment under Article 480 of the Penal Code.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "مدونة الأسرة - مسطرة التطليق للشقاق وإجراءات الصلح (المواد 94 إلى 97)",
    titleFr: "Code de la Famille - Divorce pour raison de discordance Shiqaq (Articles 94 à 97)",
    titleEn: "Family Code - Divorce for Irreconcilable Differences Shiqaq (Articles 94 to 97)",
    category: "famille",
    content: `بموجب المواد 94 إلى 97 من مدونة الأسرة (القانون 70.03)، يحق لأي من الزوجين طلب التطليق للشقاق أمام قسم قضاء الأسرة بالمحكمة الابتدائية. تجري المحكمة محاولة الصلح وجوباً عبر حكمين أو مجلس العائلة. وفي حال تعذر الإصلاح، تحكم المحكمة بالتطليق وتحدد المستحقات المالية (المتعة، العدة، السكن، الحضانة) في أجل لا يتجاوز 6 أشهر.`,
    contentFr: `En vertu des articles 94 à 97 du Code de la Famille (loi 70.03), chaque époux peut demander le divorce pour désaccord (Shiqaq). Le tribunal tente obligatoirement la conciliation. En cas d'échec, le divorce est prononcé avec fixation des droits financiers dans un délai maximal de 6 mois.`,
    contentEn: `Under Articles 94 to 97 of the Family Code (Law 70.03), either spouse may apply for divorce due to irreconcilable differences (Shiqaq). The court mandatory attempts reconciliation. If unachievable, divorce is granted and financial dues determined within 6 months.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "مدونة الأسرة - ثبوت الزوجية وحقوق الأطفال في النسب والنيابة الشرعية (المادتان 16 و 236)",
    titleFr: "Code de la Famille - Action en confirmation de mariage et tutelle légale (Articles 16 & 236)",
    titleEn: "Family Code - Marriage Confirmation Action & Legal Guardianship (Articles 16 & 236)",
    category: "famille",
    content: `تحدد المادة 16 من مدونة الأسرة الأحكام المتعلقة بدعوى ثبوت الزوجية لحماية حقوق الأسرة، بينما تنص المادة 236 على أن الأب هو النائب الشرعي عن أبنائه القاصرين بحكم القانون، وتؤول النيابة الشرعية للأم في حالة غياب الأب أو فقدانه للأهلية لحفظ أموال ومصالح الأطفال.`,
    contentFr: `L'article 16 du Code de la Famille régit l'action en confirmation de mariage. L'article 236 dispose que le père est de droit le tuteur légal de ses enfants mineurs, la tutelle revenant à la mère en cas d'absence ou d'incapacité du père.`,
    contentEn: `Article 16 of the Family Code governs marriage confirmation legal actions. Article 236 establishes that the father is the default legal guardian of minor children, with guardianship devolving to the mother in case of father's absence or incapacity.`,
    url: "https://adala.justice.gov.ma"
  },

  // ─── COMMERCE (التجارة والشركات) ─────────────────────────────
  {
    title: "التجارة وحماية المستهلك - عيوب الرضا وحماية المستهلك في البيوع عن بعد (القانون 31.08 وقانون الالتزامات والعقود)",
    titleFr: "Droit Commercial - Protection du consommateur et vente à distance (Loi 31.08 & DOC)",
    titleEn: "Commercial Law - Consumer Protection & Distance Selling (Law 31.08 & DOC)",
    category: "commerce",
    content: `وفقاً لقانون الالتزامات والعقود المغربي ومقتضيات القانون رقم 31.08 المتعلق بتحديد تدابير لحماية المستهلك، يلتزم البائع بضمان السلع والعيوب الخفية. كما يمنح القانون للمستهلك الحق في التراجع داخل أجل 7 أيام في المعاملات والبيوع عن بعد (التجارة الإلكترونية) ودون الحاجة لتبرير السبب.`,
    contentFr: `Conformément au DOC et à la loi 31.08 sur la protection du consommateur, le vendeur garantit la chose vendue contre les vices cachés. Le consommateur dispose d'un droit de rétractation de 7 jours pour les achats en ligne sans avoir à se justifier.`,
    contentEn: `Pursuant to the Moroccan Code of Obligations and Contracts (DOC) and Law 31.08 on Consumer Protection, sellers warrant against hidden defects. Consumers also enjoy a 7-day right of withdrawal for online and distance transactions without penalty.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "قانون الشركات - تأسيس الشركات ذات المسؤولية المحدودة (SARL) وشروط الشركاء (القانون 5.96)",
    titleFr: "Droit des Sociétés - Création des sociétés SARL & SARL AU (Loi 5.96)",
    titleEn: "Company Law - Incorporation of Limited Liability Companies SARL (Law 5.96)",
    category: "commerce",
    content: `يحدد القانون رقم 5.96 المتعلق بالشركة ذات المسؤولية المحدودة (SARL) والشركة ذات المسؤولية المحدودة من شريك واحد (SARL AU) قواعد التأسيس، حيث لا يتطلب القانون حداً أدنى لرأس المال الشركاتي. يتم التأسيس عبر إيداع النظام الأساسي والسجل التجاري والتصريح بالتأسيس لدى المركز الجهوي للاستثمار.`,
    contentFr: `La loi 5.96 régissant la SARL et la SARL à associé unique (SARL AU) fixe les règles de constitution. Aucun capital social minimum n'est imposé par la loi. La création s'effectue par dépôt des statuts et immatriculation au registre du commerce via le CRI.`,
    contentEn: `Law 5.96 governing SARL and single-member SARL AU establishes incorporation rules. No minimum share capital is mandated. Incorporation is finalized by registering articles of association and obtaining commercial registry enrolment at the Regional Investment Centre.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "مدونة التجارة - الأوراق التجارية وأحكام الكمبيالة والشيك بدون مؤونة (القانون 15.95)",
    titleFr: "Code de Commerce - Effets de commerce et chèques sans provision (Loi 15.95)",
    titleEn: "Commercial Code - Commercial Instruments & NSF Checks (Law 15.95)",
    category: "commerce",
    content: `تنظم المواد 159 وما يليها من القانون رقم 15.95 (مدونة التجارة) أحكام التعامل بالشيك والكمبيالة والسند لأمر. يعتبر إصدار شيك بدون مؤونة قابلة للتداول أو بمؤونة غير كافية جريمة تجارية وجنائية يعاقب عليها القانون بالسجن من سنة إلى 5 سنوات وغرامة مالية طبقاً للمادة 316 من مدونة التجارة.`,
    contentFr: `Les articles 159 et suivants de la loi 15.95 (Code de Commerce) régissent le chèque, la lettre de change et le billet à ordre. L'émission d'un chèque sans provision constitue un délit puni de 1 à 5 ans d'emprisonnement et d'une amende (article 316 du Code de Commerce).`,
    contentEn: `Articles 159 et seq. of Law 15.95 (Commercial Code) regulate checks, bills of exchange, and promissory notes. Issuing a check without sufficient funds is a criminal offense punishable by 1 to 5 years imprisonment and fines under Article 316.`,
    url: "https://adala.justice.gov.ma"
  },

  // ─── PENAL (الجنائي) ───────────────────────────────────────────
  {
    title: "القانون الجنائي - جريمة النصب والاحتيال وسلب أموال الغير (الفصل 540 من القانون الجنائي)",
    titleFr: "Code Pénal - Délit d'escroquerie et tromperie (Article 540 du Code Pénal)",
    titleEn: "Penal Code - Offense of Fraud & Deceit (Article 540 of the Penal Code)",
    category: "penal",
    content: `يعاقب الفصل 540 من مجموعة القانون الجنائي المغربي بالحبس من سنة إلى خمس سنوات وغرامة من 500 إلى 5000 درهم كل من استعمل الاحتيال ليوقع شخصاً في الغلط بتأكيدات خادعة أو إخفاء وقائع صحيحة واستولى بذلك على أمواله أو منقولاته. وتشدد العقوبة إذا استغل الجاني صفة مهنية.`,
    contentFr: `L'article 540 du Code Pénal punit d'un emprisonnement d'un à cinq ans et d'une amende de 500 à 5.000 dirhams quiconque emploie des manœuvres frauduleuses pour déterminer la remise de fonds ou biens. La peine est aggravée en cas d'usage de qualité professionnelle.`,
    contentEn: `Article 540 of the Moroccan Penal Code punishes fraud and fraudulent misrepresentation with 1 to 5 years imprisonment and fines of 500 to 5,000 MAD. Penalties are heightened if professional status is exploited.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "القانون الجنائي - جريمة السرقة والعقوبات المشددة وظروف التشديد (الفصل 505 وما بعده)",
    titleFr: "Code Pénal - Vol simple et vol qualifié avec circonstances aggravantes (Articles 505 et suiv.)",
    titleEn: "Penal Code - Theft & Aggravated Robbery (Articles 505 et seq.)",
    category: "penal",
    content: `ينص الفصل 505 من القانون الجنائي المغربي على أن من اختلس عمداً مالاً مملوكاً للغير يعد سارقاً ويعاقب بالحبس من سنة إلى 5 سنوات. وتتحول السرقة إلى جناية مشددة تعاقب بالسجن المؤقت أو المؤبد إذا اقترنت بظروف الليل، التعدد، استخدام السلاح، أو الكسر (الفصول 507 إلى 509).`,
    contentFr: `L'article 505 du Code Pénal dispose que la soustraction frauduleuse de la chose d'autrui constitue un vol puni de 1 à 5 ans de prison. Le vol devient un crime qualifié (réclusion à temps ou à perpétuité) en cas de circonstances aggravantes (nuit, pluralité d'auteurs, armes, effraction).`,
    contentEn: `Article 505 of the Penal Code defines theft as fraudulent taking of another's property, punishable by 1 to 5 years imprisonment. Theft escalates to felony status carrying temporary or life imprisonment under aggravating circumstances (nighttime, armed, breaking and entering).`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "القانون الجنائي - جريمة خيانة الأمانة وتبديد المنقولات أو الأموال (الفصل 547 من القانون الجنائي)",
    titleFr: "Code Pénal - Abus de confiance et dissipation de biens (Article 547 du Code Pénal)",
    titleEn: "Penal Code - Breach of Trust & Misappropriation (Article 547 of the Penal Code)",
    category: "penal",
    content: `يعاقب الفصل 547 من القانون الجنائي بالحبس من 6 أشهر إلى 3 سنوات وغرامة مالية كل من اختلس أو بدد إضراراً بالمالك أو الواضع عقوداً أو أموالاً أو بضائع سُلمت إليه على سبيل الوكالة أو الإجارة أو الرهن أو العارية، وتشدد العقوبة إذا كان الخائن خادماً أو أجيراً بمقابل.`,
    contentFr: `L'article 547 du Code Pénal punit de 6 mois à 3 ans de prison et d'une amende quiconque détourne ou meublant à préjudice des biens ou contrats remis à titre de mandat, bail, gage ou prêt. La peine est plus lourde pour un salarié ou préposé.`,
    contentEn: `Article 547 of the Penal Code penalizes breach of trust and property conversion with 6 months to 3 years imprisonment and fines when property entrusted under lease, bailment, or mandate is misappropriated.`,
    url: "https://adala.justice.gov.ma"
  },

  // ─── ADMINISTRATIF (الإداري) ──────────────────────────────────
  {
    title: "القضاء الإداري - دعوى الإلغاء لتجاوز السلطة والشطط الإداري (المادة 20 من القانون 41.90)",
    titleFr: "Contentieux Administratif - Recours en annulation pour excès de pouvoir (Article 20 de la loi 41.90)",
    titleEn: "Administrative Law - Annulment Recours for Abuse of Power (Article 20 of Law 41.90)",
    category: "administratif",
    content: `طبقاً للمادة 20 من القانون رقم 41.90 المحدث للمحاكم الإدارية، تختص المحكمة الإدارية بالبت في طلبات الإلغاء بسبب تجاوز السلطة ضد القرارات الصادرة عن السلطات الإدارية لعيب عدم الاختصاص، أو انعدام التعليل، أو عيب الشكل، أو مخالفة القانون. يودع الطعن داخل أجل 60 يوماً من تاريخ التبليغ أو النشر.`,
    contentFr: `Selon l'article 20 de la loi 41.90 instituant les tribunaux administratifs, le tribunal administratif est compétent pour statuer sur les recours en annulation pour excès de pouvoir contre les décisions administratives viciées par incompétence, vice de forme ou violation de la loi, dans un délai de 60 jours.`,
    contentEn: `Pursuant to Article 20 of Law 41.90 establishing administrative courts, administrative courts hold jurisdiction over annulment petitions for abuse of authority filed against illegal or ultra vires administrative acts within 60 days of notification.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "القانون الإداري - المسؤولية الإدارية والتعويض عن أضرار المرافق العمومية (الفصلان 79 و 80 من ق.ل.ع)",
    titleFr: "Droit Administratif - Responsabilité de la puissance publique (Articles 79 & 80 du DOC)",
    titleEn: "Administrative Law - Public Authority Liability & Damages (Articles 79 & 80 of DOC)",
    category: "administratif",
    content: `ينص الفصلان 79 و80 من قانون الالتزامات والعقود المغربي على أن الدولة والبلديات مسؤولة عن الأضرار الناتجة مباشرة عن تسيير إداراتها وعن الأخطاء المصلحية لمرفقيها، بينما يسأل الموظف شخصياً عن أخطائه الجسيمة أو التدليسية أثناء ممارسة مهامه.`,
    contentFr: `Les articles 79 et 80 du DOC établissent la responsabilité de l'État et des collectivités locales pour les dommages résultant directement du fonctionnement de leurs services, tandis que le fonctionnaire réponds personnellement de ses fautes lourdes ou intentionnelles.`,
    contentEn: `Articles 79 & 80 of the DOC set forth public state and municipal liability for harm caused directly by administrative operations, while public servants remain personally liable for gross or willful misconduct.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "القانون الإداري - نزع الملكية لأجل المنفعة العامة والتعويض القضائي (القانون رقم 7.81)",
    titleFr: "Droit Administratif - Expropriation pour cause d'utilité publique (Loi 7.81)",
    titleEn: "Administrative Law - Expropriation for Public Utility (Law 7.81)",
    category: "administratif",
    content: `ينظم القانون رقم 7.81 مسطرة نزع ملكية العقارات للمنفعة العامة وإحداث الطرق. لا يجوز نزع الملكية إلا لنفع عام ومقابل تعويض عادل تقرره لجنة التقييم الإدارية أو تحدده المحكمة الإدارية بناءً على القيمة التجارية للعقار وقت صدور قرار المنفعة العامة.`,
    contentFr: `La loi 7.81 régit la procédure d'expropriation pour cause d'utilité publique. L'expropriation exige un motif d'intérêt public légitime et le versement préalable d'une indemnité juste fixée à la valeur vénale de l'immeuble.`,
    contentEn: `Law 7.81 regulates real estate expropriation for public utility projects. Expropriation requires legitimate public purpose and payment of fair compensation assessed according to market property values.`,
    url: "https://adala.justice.gov.ma"
  },

  // ─── GENERAL (عام) ──────────────────────────────────────────────
  {
    title: "الدستور المغربي - المساواة وحق التقاضي والمحاكمة العادلة (الفصول 19، 118، 120)",
    titleFr: "Constitution Marocaine - Égalité, droit de recours et procès équitable (Articles 19, 118, 120)",
    titleEn: "Moroccan Constitution - Equality, right of recourse and fair trial (Articles 19, 118, 120)",
    category: "general",
    content: `ينص الفصل 19 على تمتع الرجل والمرأة على قدم المساواة بالحقوق والحريات المدنية والسياسية. ويضمن الفصل 118 حق التقاضي لكل شخص للدفاع عن حقوقه، بينما يقرر الفصل 120 حق كل شخص في محاكمة عادلة وفي حكم يصدر داخل أجل معقول وحقوق الدفاع مضمونة.`,
    contentFr: `L'article 19 consacre l'égalité homme-femme dans les droits civils et politiques. L'article 118 garantit l'accès à la justice à toute personne pour la défense de ses droits, et l'article 120 dispose que toute personne a droit à un procès équitable rendu dans un délai raisonnable.`,
    contentEn: `Article 19 enshrines gender equality in civil and political rights. Article 118 guarantees universal access to courts to defend legal rights, and Article 120 guarantees the right to a fair trial delivered within a reasonable timeframe.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "قانون الالتزامات والعقود (D.O.C) - أركان العقد وقوته الملزمة والتعويض (الفصول 2، 230، 264)",
    titleFr: "Dahir des Obligations et des Contrats (DOC) - Éléments, force obligatoire et dommages (Articles 2, 230, 264)",
    titleEn: "Code of Obligations and Contracts (DOC) - Elements, binding force, and damages (Articles 2, 230, 264)",
    category: "general",
    content: `يحدد الفصل 2 أركان الالتزام (الأهلية، والرضا، ومحل محدد، وسبب مشروع). ويقر الفصل 230 مبدأ العقد شريعة المتعاقدين (الالتزامات التعاقدية المنشأة على وجه صحيح تقوم مقام القانون). ويحدد الفصل 264 قواعد تقدير التعويض والشرط الجزائي عن الضرر اللاحق بالدائن.`,
    contentFr: `L'article 2 fixe les conditions essentielles de validité des obligations (capacité, consentement, objet et cause licite). L'article 230 consacre la force obligatoire : les obligations contractuelles valablement formées tiennent lieu de loi entre les parties. L'article 264 régit l'évaluation des dommages-intérêts et la clause pénale.`,
    contentEn: `Article 2 outlines contract validity requirements (legal capacity, consent, lawful object and cause). Article 230 establishes that legally formed contractual obligations hold the force of law between the parties. Article 264 specifies the assessment of damages and penalty clauses.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "قانون المسطرة المدنية - شروط رفع الدعوى والمقال الافتتاحي (الفصول 1، 31، 32)",
    titleFr: "Code de Procédure Civile - Conditions d'action et requête introductive (Articles 1, 31, 32)",
    titleEn: "Code of Civil Procedure - Standing requirements and introductory petitions (Articles 1, 31, 32)",
    category: "general",
    content: `يوجب الفصل 1 توافر الصفة والأهلية والمصلحة لإثبات الحقوق أمام القضاء. وينص الفصل 31 على رفع الدعوى بمقال مكتوب أو تصريح شفوي يحرر به محضر. ويفصل الفصل 32 البيانات الإلزامية للمقال الافتتاحي (أسماء الأطراف، موطنهم، موضوع الدعوى، والوقائع والوسائل المثارة).`,
    contentFr: `L'article 1er impose la justification de la qualité, de la capacité et de l'intérêt pour ester en justice. L'article 31 dispose que l'action est introduite par requête écrite ou déclaration verbale. L'article 32 détaille les mentions obligatoires du mémoire introductif d'instance (identité, domicile, exposé des faits et conclusions).`,
    contentEn: `Article 1 requires legal standing, legal capacity, and legitimate interest to bring an action before the court. Article 31 provides that claims are filed by written petition or oral statement recorded by the court clerk. Article 32 mandates the essential requirements of the filing complaint.`,
    url: "https://adala.justice.gov.ma"
  },

  // ─── TRAVAIL (الشغل) ────────────────────────────────────────────
  {
    title: "مدونة الشغل - مسطرة الاستماع وإثبات الخطأ الجسيم (المادة 62 من مدونة الشغل)",
    titleFr: "Code du Travail - Procédure d'écoute et licenciement pour faute grave (Article 62)",
    titleEn: "Labor Code - Hearing Procedure & Dismissal for Gross Misconduct (Article 62)",
    category: "travail",
    content: `تنص المادة 62 من مدونة الشغل (القانون 65.99) على أنه يجب قبل فصل الأجير إتاحة الفرصة له للدفاع عن نفسه بالاستماع إليه من طرف المشغل بحضور مندوب الأجراء داخل أجل لا يتعدى 8 أيام من تبين الخطأ. يحرر محضر تسلم نسخة منه للأجير، وخرق هذا الإجراء يجعل الفصل تعسفياً.`,
    contentFr: `L'article 62 du Code du Travail (loi 65.99) fait obligation à l'employeur d'entendre le salarié assisté d'un délégué du personnel dans un délai de 8 jours de la constatation de la faute grave avant tout licenciement. L'inobservation de cette procédure rend le licenciement abusif.`,
    contentEn: `Article 62 of the Labor Code (Law 65.99) mandates that employers hold a formal hearing with the employee accompanied by an employee representative within 8 days of detecting gross misconduct prior to termination. Failure invalidates dismissal.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "مدونة الشغل - ساعات العمل والحق في العطلة السنوية المؤدى عنها (المواد 184 و 231)",
    titleFr: "Code du Travail - Durée du travail et congé annuel payé (Articles 184 & 231)",
    titleEn: "Labor Code - Working Hours & Paid Annual Leave (Articles 184 & 231)",
    category: "travail",
    content: `تحدد المادة 184 من مدونة الشغل مدة العمل العادية في 2288 ساعة سنوياً أو 44 ساعة أسبوعياً. بينما تمنح المادة 231 وما يليها للأجير الحق في عطلة سنوية مؤدى عنها تُحسب على أساس يوم ونصف يوم عمل فعلي عن كل شهر من الخدمة بعد قضاء 6 أشهر من العمل المسترسل.`,
    contentFr: `L'article 184 du Code du Travail fixe la durée normale de travail à 2.288 heures par an ou 44 heures par semaine. L'article 231 accorde au salarié un congé payé de 1,5 jour ouvrable par mois de service effectif après 6 mois d'ancienneté.`,
    contentEn: `Article 184 of the Labor Code sets standard working hours at 2,288 hours per year or 44 hours per week. Article 231 grants employees paid annual leave of 1.5 working days per month of service after 6 months continuous employment.`,
    url: "https://adala.justice.gov.ma"
  },
  {
    title: "مدونة الشغل - التعويض عن الفصل التعسفي والمهلة (المادتان 41 و 53)",
    titleFr: "Code du Travail - Indemnités de licenciement abusif et préavis (Articles 41 & 53)",
    titleEn: "Labor Code - Unfair dismissal compensation and notice period (Articles 41 & 53)",
    category: "travail",
    content: `تنص المادة 41 و 53 من مدونة الشغل المغربية (القانون 65.99) على استحقاق الأجير المفصول تعسفياً لتعويضات تشمل: التعويض عن الفصل، والتعويض عن الضرر (شهر ونصف عن كل سنة عمل في حدود 36 شهراً)، إضافة إلى التعويض عن أجل الإخطار (الإنذار).`,
    contentFr: `Les articles 41 et 53 de la loi 65.99 prévoient les réparations dues au salarié en cas de licenciement abusif : indemnité légale de licenciement, dommages-intérêts (1,5 mois de salaire par an plafonné à 36 mois) et indemnité de préavis.`,
    contentEn: `Articles 41 and 53 of Moroccan Law 65.99 govern the statutory compensations for unfair dismissal: statutory severance payment, damages (1.5 months per year worked capped at 36 months), and notice period compensation.`,
    url: "https://adala.justice.gov.ma"
  }
];

async function cleanAndSeedResources() {
  try {
    await db.sequelize.sync({ alter: true });

    // Wipe existing resource records
    await LegalResource.destroy({ where: {}, truncate: true }).catch(async () => {
      await LegalResource.destroy({ where: {} });
    });
    console.log('🧹 Cleaned existing legal resources from database.');

    // Bulk create distinct resources
    const createdItems = await LegalResource.bulkCreate(LEGAL_RESOURCES);
    console.log(`✅ Cleaned & re-seeded database with ${createdItems.length} distinct Moroccan legal resources.`);

    const categoryCounts = {};
    for (const item of createdItems) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }
    console.log('📊 Category Breakdown:', categoryCounts);

    return createdItems;
  } catch (error) {
    console.error('❌ Error during clean & seed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  cleanAndSeedResources().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { cleanAndSeedResources, LEGAL_RESOURCES };
