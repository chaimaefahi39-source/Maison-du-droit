/**
 * Seed script for Maison du Droit
 * Seeds the legal_resources table with sample legal articles and generates embeddings.
 *
 * Usage: npm run seed
 */
require('dotenv').config();
const db = require('./models');
const { generateEmbedding } = require('./services/openai.service');
const sequelize = require('./config/database');

const LEGAL_RESOURCES = [
  {
    title: "Droit du travail - Contrat de travail",
    category: "travail",
    content: `Le contrat de travail est un accord par lequel une personne (le salarié) s'engage à travailler pour le compte et sous la direction d'une autre personne (l'employeur) en échange d'une rémunération. Les principaux types de contrats sont : le CDI (Contrat à Durée Indéterminée), le CDD (Contrat à Durée Déterminée), et le contrat de travail temporaire. Le CDI est la forme normale du contrat de travail. Le CDD ne peut être conclu que pour l'exécution d'une tâche précise et temporaire. La période d'essai permet à l'employeur d'évaluer les compétences du salarié et au salarié d'apprécier si les fonctions lui conviennent.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/N19871"
  },
  {
    title: "Droit du travail - Licenciement",
    category: "travail",
    content: `Le licenciement est la rupture du contrat de travail à l'initiative de l'employeur. Il peut être pour motif personnel (faute, insuffisance professionnelle) ou pour motif économique. L'employeur doit respecter une procédure stricte : convocation à un entretien préalable, notification du licenciement par lettre recommandée avec accusé de réception, et respect du préavis. Le salarié licencié a droit à une indemnité de licenciement s'il justifie d'au moins 8 mois d'ancienneté. En cas de licenciement abusif, le salarié peut saisir le conseil de prud'hommes.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/N19611"
  },
  {
    title: "Droit du logement - Bail d'habitation",
    category: "logement",
    content: `Le bail d'habitation est le contrat par lequel un propriétaire (bailleur) met un logement à la disposition d'un locataire moyennant un loyer. La durée minimale du bail est de 3 ans pour un bailleur personne physique et 6 ans pour une personne morale. Le locataire dispose d'un droit au maintien dans les lieux. Le bailleur ne peut donner congé qu'à l'échéance du bail et pour des motifs précis : reprise pour habiter, vente du logement, ou motif légitime et sérieux. Le dépôt de garantie est limité à un mois de loyer hors charges. L'état des lieux d'entrée et de sortie est obligatoire.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/N349"
  },
  {
    title: "Droit du logement - Expulsion locative",
    category: "logement",
    content: `L'expulsion d'un locataire ne peut intervenir que sur décision de justice. Le propriétaire doit d'abord faire constater les impayés de loyer, puis envoyer un commandement de payer par huissier. Si le locataire ne régularise pas sa situation, le propriétaire peut saisir le tribunal. La trêve hivernale (du 1er novembre au 31 mars) interdit toute expulsion. Le locataire en difficulté peut demander des délais de paiement au juge ou solliciter l'aide du Fonds de Solidarité pour le Logement (FSL). L'expulsion sans décision de justice est un délit.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/F31272"
  },
  {
    title: "Droit de la famille - Divorce",
    category: "famille",
    content: `Le divorce peut être prononcé selon quatre procédures : le divorce par consentement mutuel (y compris sans juge depuis 2017), le divorce pour acceptation du principe de la rupture, le divorce pour altération définitive du lien conjugal (après 1 an de séparation), et le divorce pour faute. En cas de divorce par consentement mutuel sans juge, les époux doivent être assistés chacun d'un avocat. La convention de divorce est déposée chez un notaire. Le divorce règle les questions de la prestation compensatoire, du partage des biens, de la garde des enfants et de la pension alimentaire.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/N159"
  },
  {
    title: "Droit de la famille - Garde des enfants",
    category: "famille",
    content: `En cas de séparation des parents, la résidence des enfants peut être fixée au domicile de l'un des parents ou en alternance. Le juge aux affaires familiales statue en fonction de l'intérêt supérieur de l'enfant. Les critères pris en compte incluent : les pratiques antérieures des parents, les sentiments exprimés par l'enfant, l'aptitude de chaque parent à assumer ses devoirs, et les résultats des enquêtes sociales. Le parent qui n'a pas la résidence dispose d'un droit de visite et d'hébergement. La pension alimentaire est fixée en fonction des ressources de chaque parent et des besoins de l'enfant.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/F18786"
  },
  {
    title: "Droit commercial - Création d'entreprise",
    category: "commerce",
    content: `La création d'entreprise nécessite le choix d'une forme juridique adaptée : entreprise individuelle, EURL, SARL, SAS, SA, etc. L'entrepreneur individuel n'a pas de capital minimum à apporter. La SARL nécessite au minimum 2 associés et la SAS au minimum 1 associé. L'immatriculation au Registre du Commerce et des Sociétés (RCS) est obligatoire pour les commerçants. Le Centre de Formalités des Entreprises (CFE) centralise les démarches. Le régime de la micro-entreprise offre des formalités simplifiées et un régime fiscal avantageux pour les petites activités.`,
    url: "https://www.service-public.fr/professionnels-entreprises/vosdroits/N16178"
  },
  {
    title: "Droit pénal - Droits de la victime",
    category: "penal",
    content: `La victime d'une infraction pénale dispose de plusieurs droits : porter plainte auprès de la police, de la gendarmerie ou du procureur de la République ; se constituer partie civile pour demander réparation de son préjudice ; être assistée d'un avocat ; être informée de l'avancement de la procédure. Les associations d'aide aux victimes peuvent accompagner la victime dans ses démarches. La Commission d'Indemnisation des Victimes d'Infractions (CIVI) peut accorder une indemnisation même si l'auteur n'est pas identifié ou insolvable. Le délai de prescription pour porter plainte varie selon la nature de l'infraction.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/N19468"
  },
  {
    title: "Droit administratif - Recours administratif",
    category: "administratif",
    content: `Face à une décision administrative défavorable, le citoyen peut exercer un recours gracieux (auprès de l'auteur de la décision) ou hiérarchique (auprès du supérieur). En cas d'échec, un recours contentieux peut être introduit devant le tribunal administratif. Le délai de recours est généralement de 2 mois à compter de la notification de la décision. Le recours administratif préalable est parfois obligatoire. Le Défenseur des droits peut être saisi en cas de litige avec une administration. L'aide juridictionnelle permet aux personnes à faibles revenus de bénéficier de la prise en charge des frais de justice.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/F2474"
  },
  {
    title: "Droit du travail - Congés payés",
    category: "travail",
    content: `Tout salarié a droit à des congés payés annuels. Le salarié acquiert 2,5 jours ouvrables de congés par mois de travail effectif, soit 30 jours ouvrables (5 semaines) par an. La période de référence pour le calcul des congés va du 1er juin au 31 mai. Le congé principal (minimum 12 jours ouvrables consécutifs) doit être pris entre le 1er mai et le 31 octobre. L'employeur fixe les dates de congés après consultation des représentants du personnel. L'indemnité de congés payés est calculée selon la méthode la plus favorable au salarié (maintien de salaire ou 1/10ème de la rémunération brute annuelle).`,
    url: "https://www.service-public.fr/particuliers/vosdroits/F2258"
  },
  {
    title: "Droit de la consommation - Protection du consommateur",
    category: "general",
    content: `Le consommateur bénéficie de nombreuses protections : droit de rétractation de 14 jours pour les achats à distance, garantie légale de conformité de 2 ans, garantie des vices cachés, obligation d'information du professionnel, interdiction des clauses abusives. En cas de litige, le consommateur peut saisir le médiateur de la consommation, la DGCCRF (Direction Générale de la Concurrence, de la Consommation et de la Répression des Fraudes), ou le tribunal. Les associations de consommateurs peuvent agir en justice au nom des consommateurs.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/N10515"
  },
  {
    title: "Droit du logement - Aides au logement",
    category: "logement",
    content: `Plusieurs aides financières existent pour le logement : l'APL (Aide Personnalisée au Logement), l'ALS (Allocation de Logement Social), et l'ALF (Allocation de Logement Familial). Ces aides sont versées par la CAF (Caisse d'Allocations Familiales) et calculées en fonction des ressources, de la composition du foyer et du montant du loyer. Le FSL (Fonds de Solidarité pour le Logement) peut accorder des aides pour le dépôt de garantie, le premier mois de loyer ou les dettes de loyer. La garantie Visale peut se porter caution pour les locataires qui n'ont pas de garant.`,
    url: "https://www.service-public.fr/particuliers/vosdroits/N20360"
  },
];

async function seed() {
  try {
    console.log('Connecting to database...');
    await db.sequelize.sync({ alter: true });
    await db.setupPgVector();
    console.log('Database synced and pgvector ready.');

    // Check if resources already exist
    const existingCount = await db.LegalResource.count();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} resources. Skipping seed.`);
      process.exit(0);
    }

    console.log(`Seeding ${LEGAL_RESOURCES.length} legal resources...`);

    for (const resource of LEGAL_RESOURCES) {
      // Create the resource first
      const created = await db.LegalResource.create({
        title: resource.title,
        category: resource.category,
        content: resource.content,
        url: resource.url,
      });

      // Generate and store embedding
      try {
        const embedding = await generateEmbedding(resource.content);
        const embeddingStr = `[${embedding.join(',')}]`;
        await sequelize.query(
          `UPDATE legal_resources SET embedding = :embedding::vector WHERE id = :id`,
          { replacements: { embedding: embeddingStr, id: created.id } }
        );
        console.log(`  ✓ ${resource.title} (+ embedding)`);
      } catch (embErr) {
        console.warn(`  ⚠ ${resource.title} (no embedding: ${embErr.message})`);
      }
    }

    console.log('\n✅ Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
