/**
 * The Lobia item catalogue, generated from Objects.xlsx — DO NOT HAND-EDIT.
 * Regenerate with scratchpad/extract-items.mjs (see HANDOFF §7).
 *
 * 146 items. Each carries the three catalogue fields the spreadsheet
 * holds: name, price and description.
 */
export const ITEM_CATALOGUE = [
  {
    "name": "Poké Ball",
    "subcategory": "pokeball-standard",
    "price": 200,
    "description": "<p>Permet de capturer des Pokémons.</p>"
  },
  {
    "name": "Super Ball",
    "subcategory": "pokeball-standard",
    "price": 600,
    "description": "<p>Permet de capturer des Pokémons et ajoute 25 au lancé de dé du maître de jeu lors de la capture.</p>"
  },
  {
    "name": "Hyper Ball",
    "subcategory": "pokeball-standard",
    "price": 1200,
    "description": "<p>Permet de capturer des Pokémons et ajoute 50 au lancé de dé du maître de jeu lors de la capture.</p>"
  },
  {
    "name": "Honor Ball",
    "subcategory": "pokeball-standard",
    "price": 0,
    "description": "<p>Permet de capturer des Pokémons. Donner en cadeau pour chaque achat de 10 Pokéballs en une seule fois.</p>"
  },
  {
    "name": "Poké Ball Art.",
    "subcategory": "pokeball-standard",
    "price": 500,
    "description": "<p>Une Pokéball fabriquée de mannière artisanale. Permet de capturer des Pokémons. Le personnage doit réaliser une épreuve de Talent pour atteindre sa cible, mais en cas de réussite, vous lancez le dé de capture avec avantage.</p>"
  },
  {
    "name": "Super Ball Art.",
    "subcategory": "pokeball-standard",
    "price": 1500,
    "description": "<p>Une Pokéball fabriquée de mannière artisanale. Permet de capturer des Pokémons et ajoute 25 au lancé de dé du maître de jeu lors de la capture. Le personnage doit réaliser une épreuve de Talent pour atteindre sa cible, mais en cas de réussite, vous lancez le dé de capture avec avantage.</p>"
  },
  {
    "name": "Hyper Ball Art.",
    "subcategory": "pokeball-standard",
    "price": 2500,
    "description": "<p>Une Pokéball fabriquée de mannière artisanale. Permet de capturer des Pokémons et ajoute 50 au lancé de dé du maître de jeu lors de la capture. Le personnage doit réaliser une épreuve de Talent pour atteindre sa cible, mais en cas de réussite, vous lancez le dé de capture avec avantage.</p>"
  },
  {
    "name": "Masse Ball",
    "subcategory": "pokeball-poids",
    "price": 400,
    "description": "<p>Permet de capturer des Pokémons, plus le Pokémon est lourd plus le bonus de capture est grand. Le bonus de capture est égale au poids du Pokémon divisé par 10. Le bonus de capture ne peut pas dépasser 25.</p>"
  },
  {
    "name": "Mégamasse Ball",
    "subcategory": "pokeball-poids",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, plus le Pokémon est lourd plus le bonus de capture est grand. Le bonus de capture est égale au poids du Pokémon divisé par 10. Le bonus de capture ne peut pas dépasser 50.</p>"
  },
  {
    "name": "Gigamasse Ball",
    "subcategory": "pokeball-poids",
    "price": 2000,
    "description": "<p>Permet de capturer des Pokémons, plus le Pokémon est lourd plus le bonus de capture est grand. Le bonus de capture est égale au poids du Pokémon divisé par 10. Le bonus de capture ne peut pas dépasser 100.</p>"
  },
  {
    "name": "Plume Ball",
    "subcategory": "pokeball-poids",
    "price": 400,
    "description": "<p>Permet de capturer des Pokémons, plus le Pokémon est léger, plus le bonus de capture est grand. Retirez à 25 le poids du Pokémon en kilo, le bonus de capture est égale à ce résultat, si le résultat est négatif le bonus de capture est considérée comme nul.</p>"
  },
  {
    "name": "Envol Ball",
    "subcategory": "pokeball-poids",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, plus le Pokémon est léger, plus le bonus de capture est grand. Retirez à 50 le poids du Pokémon en kilo, le bonus de capture est égale à ce résultat, si le résultat est négatif le bonus de capture est considérée comme nul.</p>"
  },
  {
    "name": "Propulse Ball",
    "subcategory": "pokeball-poids",
    "price": 2000,
    "description": "<p>Permet de capturer des Pokémons, plus le Pokémon est léger, plus le bonus de capture est grand. Retirez à 100 le poids du Pokémon en kilo, le bonus de capture est égale à ce résultat, si le résultat est négatif le bonus de capture est considérée comme nul.</p>"
  },
  {
    "name": "Soin Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons. Lors d'un moment de repos, si le Pokémon est dans sa Pokéball, il reçoit 1D6 de Soin et ses problèmes de statut sont retirés.</p>"
  },
  {
    "name": "Rapide Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, plus l'initiative du dresseur au cours du combat est haute, plus le bonus de capture ajouté est grand. Le bonus se calcule en multipliant par trois l'initiative actuelle du dresseur.</p>"
  },
  {
    "name": "Chrono Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons. La Chrono Ball est la seule Pokéball capable d'être charger avant d'être lancer, le dresseur peut consommer une Action bonus pour charger la Chrono ball, à chaque chargement, cela augmente le bonus de capture de la balle de 5.</p>"
  },
  {
    "name": "Bis Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons. Si le dresseur possède déjà le Pokémon qu'il désire capturer dans son équipe, le bonus de capture devient 50.</p>"
  },
  {
    "name": "Scuba Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, si la cible est un Pokémon aquatique le bonus de capture devient 50.</p>"
  },
  {
    "name": "Faiblo Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, si la cible possède un niveau inférieur au niveau 5, le bonus de capture devient 50, si la cible possède un niveau compris entre 5 et 9 le bonus de capture devient 25 et le bonus disparait si la cible possède un niveau au-dessus du niveau 10.</p>"
  },
  {
    "name": "Sombre Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, utilisé la nuit ou dans un endroit sombre, le bonus de capture devient 50.</p>"
  },
  {
    "name": "Filet Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, utilisé sur un Pokémon de type Eau ou Insecte, le bonus de capture devient 50.</p>"
  },
  {
    "name": "Copain Ball",
    "subcategory": "pokeball-speciale",
    "price": 2500,
    "description": "<p>Permet de capturer des Pokémons. Si le Pokémon capturé avec la Copain Ball peut évoluer par bonheur, il évolue immédiatement.</p>"
  },
  {
    "name": "Luxe Ball",
    "subcategory": "pokeball-speciale",
    "price": 5000,
    "description": "<p>Permet de capturer des Pokémons. Si le Pokémon capturé avec la Luxe Ball peut évoluer par bonheur, il évolue immédiatement. Le bonus de capture de cette ball est de 25.</p>"
  },
  {
    "name": "Safari Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, utilisé dans des terres sauvages loin de la civilisation, le bonus de capture devient 25.</p>"
  },
  {
    "name": "Appât Ball",
    "subcategory": "pokeball-speciale",
    "price": 400,
    "description": "<p>Permet de capturer des Pokémons, utilisé pendant la pêche, le bonus de capture devient 25.</p>"
  },
  {
    "name": "Lune ball",
    "subcategory": "pokeball-speciale",
    "price": 600,
    "description": "<p>Permet de capturer des Pokémons, utilisé sur un Pokémon pouvant évoluer grâce à une Pierre Lune, le bonus de capture devient 50.</p>"
  },
  {
    "name": "Love Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, utilisé sur un Pokémon du sexe opposé au dresseur le bonus de capture devient 50.</p>"
  },
  {
    "name": "Niveau Ball",
    "subcategory": "pokeball-speciale",
    "price": 2000,
    "description": "<p>Permet de capturer des Pokémons, plus votre niveau est élevé plus le bonus de capture l'est aussi. Si votre niveau est inférieur à celui de votre cible, le bonus de capture est nul. Si votre niveau est supérieure au niveau de la cible mais que la différence de niveau est inférieur à 5, le bonus de capture est égale à 25. Si la différence de niveau est supérieur à 5 et inférieur à 10, le bonus de capture est égale à 50. Si la différence de niveau est supérieur à 10 et inférieur à 15, le bonus de capture est égale à 75. Si la différence de niveau est supérieur à 15 le bonus de capture est égale à 100.</p>"
  },
  {
    "name": "Speed Ball",
    "subcategory": "pokeball-speciale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons, utilisé sur un Pokémon ayant une Vitesse supérieur à 60, le bonus de capture devient 50.</p>"
  },
  {
    "name": "Cadena Ball",
    "subcategory": "pokeball-illegale",
    "price": 1000,
    "description": "<p>Permet de capturer des Pokémons. Les Pokémons capturer ne peuvent pas sortir sans l'autorisation de leur dresseur. L'utilisation de ces Pokéballs sont interdits par la loi et on ne les trouve que sur le marché noir. Elles sont néanmoins identiques en apparence à une Pokéball normal.</p>"
  },
  {
    "name": "Hurt Ball",
    "subcategory": "pokeball-illegale",
    "price": 2500,
    "description": "<p>Permet de capturer des Pokémons. Les Pokémons capturer subissent des chocs électriques pour les rendre plus docile et les obliger à obéir à leur dresseur. L'utilisation de ces Pokéballs sont interdites par la loi et on ne les trouve que sur le marché noir.</p>"
  },
  {
    "name": "Master Ball",
    "subcategory": "pokeball-illegale",
    "price": 0,
    "description": "<p>Permet de capturer à coup sûr un Pokémon. Brise complètement la volonté du Pokémon, il devient une simple coquille vide obéissant bêtement. Le Pokémon capturé avec cette Ball reçoit un malus de -10 Général.</p>"
  },
  {
    "name": "Potion",
    "subcategory": "bonus-soin",
    "price": 300,
    "description": "<p>Soigne un personnage de 20 points de vie.</p>"
  },
  {
    "name": "Super Potion",
    "subcategory": "bonus-soin",
    "price": 700,
    "description": "<p>Soigne un personnage de 50 points de vie.</p>"
  },
  {
    "name": "Hyper Potion",
    "subcategory": "bonus-soin",
    "price": 1500,
    "description": "<p>Soigne un personnage de 100 points de vie.</p>"
  },
  {
    "name": "Potion Max",
    "subcategory": "bonus-soin",
    "price": 2500,
    "description": "<p>Soigne tous les points de vie d'un personnage.</p>"
  },
  {
    "name": "Antidote",
    "subcategory": "bonus-soin",
    "price": 100,
    "description": "<p>Soigne un personnage de l'empoisonnement et du grave empoisonnement.</p>"
  },
  {
    "name": "Anti-para",
    "subcategory": "bonus-soin",
    "price": 200,
    "description": "<p>Soigne un personnage de la paralysie.</p>"
  },
  {
    "name": "Anti-brûle",
    "subcategory": "bonus-soin",
    "price": 250,
    "description": "<p>Soigne un personnage de la brûlure.</p>"
  },
  {
    "name": "Réveil",
    "subcategory": "bonus-soin",
    "price": 200,
    "description": "<p>Soigne un personnage de la somnolence.</p>"
  },
  {
    "name": "Dégel",
    "subcategory": "bonus-soin",
    "price": 250,
    "description": "<p>Soigne un personnage du gel.</p>"
  },
  {
    "name": "Elixir",
    "subcategory": "bonus-soin",
    "price": 200,
    "description": "<p>Soigne un personnage de l'aveuglement.</p>"
  },
  {
    "name": "Focaliste",
    "subcategory": "bonus-soin",
    "price": 250,
    "description": "<p>Soigne un personnage de la confusion.</p>"
  },
  {
    "name": "Audace",
    "subcategory": "bonus-soin",
    "price": 250,
    "description": "<p>Soigne un personnage de la peur et de l'entrave.</p>"
  },
  {
    "name": "Sérénité",
    "subcategory": "bonus-soin",
    "price": 250,
    "description": "<p>Soigne un personnage de l'amour et de la provocation.</p>"
  },
  {
    "name": "Spray-clean",
    "subcategory": "bonus-soin",
    "price": 250,
    "description": "<p>Soigne un personnage des parasites et des débris de pierre.</p>"
  },
  {
    "name": "Espérance",
    "subcategory": "bonus-soin",
    "price": 200,
    "description": "<p>Soigne tous les malus de statistiques que le personnage a subit.</p>"
  },
  {
    "name": "Total soin",
    "subcategory": "bonus-soin",
    "price": 1000,
    "description": "<p>Soigne un personnage de tous ses problèmes de statut.</p>"
  },
  {
    "name": "Guérison",
    "subcategory": "bonus-soin",
    "price": 3000,
    "description": "<p>Soigne tous les points de vie d'un personnage en plus de ses problèmes de statut.</p>"
  },
  {
    "name": "Attaque +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +25 Attaque à un personnage pour le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Défense +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +25 Défense à un personnage pour le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Attaque spé. +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +25 Attaque spéciale à un personnage pour le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Défense spé. +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +25 Défense spéciale à un personnage pour le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Vitesse +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +25 Vitesse à un personnage pour le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Muscle +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Après consommation et jusqu'à la fin du combat, les chances de coup critique du personnage sont augmentés de 5%. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Précision +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Après consommation et jusqu'à la fin du combat, lorsque le Pokémon utilise une capacité possédant une difficulté, celle-ci est réduite de 10. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Physique +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +5 Physique pour tout le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Spécial +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +5 Spécial pour tout le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Armure +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +5 Armure pour tout le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Barrière +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +5 Barrière pour tout le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "Initiative +",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie un bonus de +5 Initiative pour tout le combat.</p>"
  },
  {
    "name": "Garde-stats",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Après consommation et jusqu'à la fin du combat, le personnage ne peut recevoir ni réduction, ni augmentation de statistique.</p>"
  },
  {
    "name": "Queue Skitty",
    "subcategory": "bonus-combat",
    "price": 1000,
    "description": "<p>Octroie +2 Déplacement pour tout le combat. Cet effet n'est pas cumulable.</p>"
  },
  {
    "name": "PV Plus",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Octroie une relance permanente du dé de vie : ajoute le résultat aux PV actuels et maximaux. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Protéine",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente l'Attaque de 5 points de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Calcium",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente l'Attaque spéciale de 5 points de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Fer",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente la Défense de 5 points de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Zinc",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente la Défense spéciale de 5 points de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Carbone",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente la Vitesse de 5 points de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "PP Plus",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Octroie un point supplémentaire à distribuer dans les abres d'évolutions d'un personnage. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Boost Physique",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente le Physique du personnage de 2 points de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Boost Spécial",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente le Spécial du personnage de 2 points de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Boost Armure",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente l'Armure du personnage de 1 point de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Boost Barrière",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente la Barrière du personnage de 1 point de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "Boost Initiative",
    "subcategory": "bonus-accelerateur",
    "price": 4500,
    "description": "<p>Augmente l'Initiative du personnage de 2 points de manière définitive. Cet objet est un Accélérateur.</p>"
  },
  {
    "name": "PP Max",
    "subcategory": "bonus-accelerateur",
    "price": 10000,
    "description": "<p>Permet d'obtenir l'une des capacités de l'arbre d'évolution d'un personnage sans avoir besoin de faire l'entièreté du chemin. Cet objet est un Accélérateur. Ces concoctions sont interdites à l'utilisation selon la loi, on ne les trouve qu'au marché noir.</p>"
  },
  {
    "name": "Super bonbon",
    "subcategory": "bonus-accelerateur",
    "price": 25000,
    "description": "<p>Ne peut être utiliser que sur un Pokémon. Le Pokémon gagne un niveau. Ces bonbons sont considérés interdit à l'utilisation par la loi. Les laboratoires qui les utilisent sont recherchés et détruits immédiatement, on ne les trouve qu'au marché noir.</p>"
  },
  {
    "name": "Plume force",
    "subcategory": "bonus-plumes",
    "price": 1500,
    "description": "<p>Un objet pouvant être tenue par un Pokémon. Une fois par tour, le Pokémon peut consommer une Action bonus pour recevoir +10 Attaque.</p>"
  },
  {
    "name": "Plume esprit",
    "subcategory": "bonus-plumes",
    "price": 1500,
    "description": "<p>Un objet pouvant être tenue par un Pokémon. Une fois par tour, le Pokémon peut consommer une Action bonus pour recevoir +10 Attaque spéciale.</p>"
  },
  {
    "name": "Plume armure",
    "subcategory": "bonus-plumes",
    "price": 1500,
    "description": "<p>Un objet pouvant être tenue par un Pokémon. Une fois par tour, le Pokémon peut consommer une Action bonus pour recevoir +10 Défense.</p>"
  },
  {
    "name": "Plume mental",
    "subcategory": "bonus-plumes",
    "price": 1500,
    "description": "<p>Un objet pouvant être tenue par un Pokémon. Une fois par tour, le Pokémon peut consommer une Action bonus pour recevoir +10 Défense spéciale.</p>"
  },
  {
    "name": "Plume sprint",
    "subcategory": "bonus-plumes",
    "price": 1500,
    "description": "<p>Un objet pouvant être tenue par un Pokémon. Une fois par tour, le Pokémon peut consommer une Action bonus pour recevoir +10 Vitesse.</p>"
  },
  {
    "name": "Plume santé",
    "subcategory": "bonus-plumes",
    "price": 1500,
    "description": "<p>Un objet pouvant être tenue par un Pokémon. Une fois par tour, le Pokémon peut consommer une Action bonus pour recevoir 1D8 Soin.</p>"
  },
  {
    "name": "Knocker V.0",
    "subcategory": "arme-knocker",
    "price": 1000,
    "description": "<p>Une arme de corps à corps qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise l'Attaque du dresseur.</p><p>Inflige 1D6 Dégâts physique.</p>"
  },
  {
    "name": "Knocker V.1",
    "subcategory": "arme-knocker",
    "price": 1800,
    "description": "<p>Une arme de corps à corps qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise l'Attaque du dresseur.</p><p>Inflige 1D8 Dégâts physique.</p>"
  },
  {
    "name": "Knocker V.2",
    "subcategory": "arme-knocker",
    "price": 5000,
    "description": "<p>Une arme de corps à corps qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise l'Attaque du dresseur.</p><p>Inflige 1D10 Dégâts physique.</p>"
  },
  {
    "name": "Knocker V.3",
    "subcategory": "arme-knocker",
    "price": 15000,
    "description": "<p>Une arme de corps à corps qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise l'Attaque du dresseur.</p><p>Inflige 1D12 Dégâts physique.</p>"
  },
  {
    "name": "Double Knocker",
    "subcategory": "arme-knocker",
    "price": 15000,
    "description": "<p>Une arme de corps à corps pouvant recevoir deux recharges différentes à la fois. Utilise l'Attaque du dresseur.</p><p>Lorsque le personnage atteint une cible, il peut consommer une Action bonus pour réaliser une seconde attaque. Inflige 1D8 Dégâts physique.</p>"
  },
  {
    "name": "Shooter V.0",
    "subcategory": "arme-shooter",
    "price": 1000,
    "description": "<p>Une arme de distance qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise l'Attaque spéciale du dresseur.</p><p>Inflige 1D6 Dégâts spéciaux.</p>"
  },
  {
    "name": "Shooter V.1",
    "subcategory": "arme-shooter",
    "price": 1800,
    "description": "<p>Une arme de distance qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise l'Attaque spéciale du dresseur.</p><p>Inflige 1D8 Dégâts spéciaux.</p>"
  },
  {
    "name": "Shooter V.2",
    "subcategory": "arme-shooter",
    "price": 5000,
    "description": "<p>Une arme de distance qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise l'Attaque spéciale du dresseur.</p><p>Inflige 1D10 Dégâts spéciaux.</p>"
  },
  {
    "name": "Shooter V.3",
    "subcategory": "arme-shooter",
    "price": 15000,
    "description": "<p>Une arme de distance qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise l'Attaque spéciale du dresseur.</p><p>Inflige 1D12 Dégâts spéciaux.</p>"
  },
  {
    "name": "Multi shooter",
    "subcategory": "arme-shooter",
    "price": 15000,
    "description": "<p>Une arme de distance pouvant tirer plusieurs munitions avec une seule recharge, demande un temps pour refroidir et éviter la surchauffe. Utilise l'Attaque spéciale du dresseur.</p><p>Inflige XD6 Dégâts spéciaux. Réaliser quatre épreuves, X est égale au nombre d'épreuves réussites. Après avoir été utilisé, le personnage ne peut pas l'utiliser jusqu'au début du prochain tour.</p>"
  },
  {
    "name": "Slasher V.0",
    "subcategory": "arme-slasher",
    "price": 1000,
    "description": "<p>Une arme de corps à corps qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise le Talent du dresseur. Inflige 1D6 Dégâts physiques.</p>"
  },
  {
    "name": "Slasher V.1",
    "subcategory": "arme-slasher",
    "price": 1800,
    "description": "<p>Une arme de corps à corps qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise le Talent du dresseur. Inflige 1D8 Dégâts physiques.</p>"
  },
  {
    "name": "Slasher V.2",
    "subcategory": "arme-slasher",
    "price": 5000,
    "description": "<p>Une arme de corps à corps qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise le Talent du dresseur. Inflige 1D10 Dégâts physiques.</p>"
  },
  {
    "name": "Slasher V.3",
    "subcategory": "arme-slasher",
    "price": 15000,
    "description": "<p>Une arme de corps à corps qui équipé de recharge peut infliger des dégâts du même type que la recharge. Utilise le Talent du dresseur. Inflige 1D12 Dégâts physiques.</p>"
  },
  {
    "name": "Slasher thermique",
    "subcategory": "arme-slasher",
    "price": 15000,
    "description": "<p>Une arme de corps à corps équipé d'une lame thermique passant au travers des défenses. Utilise le Talent du dresseur.</p><p>Inflige 1D10 Dégâts physiques et passent au travers des parades et protections.</p>"
  },
  {
    "name": "Blocker V.0",
    "subcategory": "arme-blocker",
    "price": 1000,
    "description": "<p>Une arme permettant de contrer les attaques en utilisant des recharges, le contre inflige des dégâts du même type que la recharge. Utilise la Défense ou la Défense spéciale du dresseur. Inflige 1D6 Dégâts spéciaux.</p>"
  },
  {
    "name": "Blocker V.1",
    "subcategory": "arme-blocker",
    "price": 1800,
    "description": "<p>Une arme permettant de contrer les attaques en utilisant des recharges, le contre inflige des dégâts du même type que la recharge. Utilise la Défense ou la Défense spéciale du dresseur. Inflige 1D8 Dégâts spéciaux.</p>"
  },
  {
    "name": "Blocker V.2",
    "subcategory": "arme-blocker",
    "price": 5000,
    "description": "<p>Une arme permettant de contrer les attaques en utilisant des recharges, le contre inflige des dégâts du même type que la recharge. Utilise la Défense ou la Défense spéciale du dresseur. Inflige 1D10 Dégâts spéciaux.</p>"
  },
  {
    "name": "Blocker V.3",
    "subcategory": "arme-blocker",
    "price": 15000,
    "description": "<p>Une arme permettant de contrer les attaques en utilisant des recharges, le contre inflige des dégâts du même type que la recharge. Utilise la Défense ou la Défense spéciale du dresseur. Inflige 1D12 Dégâts spéciaux.</p>"
  },
  {
    "name": "Blocker large",
    "subcategory": "arme-blocker",
    "price": 15000,
    "description": "<p>Une arme permettant de contrer les attaques en utilisant des recharges, grâce à un système copiant la technologie des Pokéballs, le dresseur peut déployer une barrière de protection pour défendre ses compagnons proches. Utilise la Défense ou la Défense spéciale du dresseur.</p><p>Inflige 1D6 Dégâts spéciaux. Tous les personnages au contact et derrière le personnage sont automatiquement protégé par le dresseur.</p>"
  },
  {
    "name": "Healer knocker",
    "subcategory": "arme-healer",
    "price": 12000,
    "description": "<p>Une arme de corps à corps contenant de l'énergie vitale permettant de soigner les blessures des alliés proches. Utilise la Connaissance du dresseur.</p><p>Inflige 1D8 Dégâts physiques. Le dresseur peut consommer une Action bonus pour octroyer 1D6 Soin à une cible au corps à corps.</p>"
  },
  {
    "name": "Healer shooter",
    "subcategory": "arme-healer",
    "price": 12000,
    "description": "<p>Une arme de distance créé de manière à pouvoir utiliser des objets de soin sur ses alliés sans être au contact, très utilisé par les éleveurs pour intervenir et soigner des Pokémons sauvages légèrement blesser sans se mettre en danger en les approchant. Utilise la Connaissance du dresseur.</p><p>Inflige 1D8 Dégâts spéciaux lorsqu'utiliser comme une arme ordinaire.</p>"
  },
  {
    "name": "Healer slasher",
    "subcategory": "arme-healer",
    "price": 12000,
    "description": "<p>Une arme de corps à corps créé selon le même principe que les attaques de drain, la lame est relié directement par un système de câble au bras du dresseur, le soignant en fonction des dégâts qu'il inflige. Utilise la Connaissance du dresseur.</p><p>Inflige 1D8 Dégâts physiques, le dresseur reçoit autant de point de vie que la moitié des dégâts infligés.</p>"
  },
  {
    "name": "Healer blocker",
    "subcategory": "arme-healer",
    "price": 12000,
    "description": "<p>Une arme bien étrange qui est capable de déployer une barrière de protection transformant une partie des dégâts subits en soin pour l'utilisateur et ceux autour de lui si une recharge du même type que l'attaque est utilisée. Utilise la Connaissance du dresseur.</p><p>Inflige 1D8 Dégâts spéciaux. Lorsque le personnage est attaqué et qu'il possède une recharge du même type que l'attaque le ciblant, il peut consommer une Réaction et une recharge de ce type pour transformer la moitié des dégâts de l'attaque en soin distribuer équitablement avec tous les personnages au corps à corps.</p>"
  },
  {
    "name": "Modificateur Physique",
    "subcategory": "arme-modificateur",
    "price": 5000,
    "description": "<p>Un modificateur d'arme permettant de transformer les dégâts d'une arme en dégâts physiques. La modification est définitive. Le modificateur est consommé après utilisation.</p>"
  },
  {
    "name": "Modificateur Spécial",
    "subcategory": "arme-modificateur",
    "price": 5000,
    "description": "<p>Un modificateur d'arme permettant de transformer les dégâts d'une arme en dégâts spéciaux. La modification est définitive. Le modificateur est consommé après utilisation.</p>"
  },
  {
    "name": "Modificateur Choix",
    "subcategory": "arme-modificateur",
    "price": 13000,
    "description": "<p>Un modificateur d'armes permettant à une arme de pouvoir au choix infliger des dégâts physiques ou des dégâts spéciaux. La modification est définitive. Le modificateur est consommé après utilisation.</p>"
  },
  {
    "name": "Boost charge",
    "subcategory": "accessoire-boost",
    "price": 2000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de booster les compétences des recharges et recevoir un bonus de force. Octroie un bonus de +5 Attaque et +5 Attaque spé. lorsque le personnage utilise une recharge.</p>"
  },
  {
    "name": "Boost charge +",
    "subcategory": "accessoire-boost",
    "price": 5000,
    "description": "<p>Une mise à jour de Boost charge, permettant d'augmenter encore plus les compétences des recharges. Octroie un bonus de +10 Attaque et +10 Attaque spé. lorsque le personnage utilise une recharge.</p>"
  },
  {
    "name": "Boost charge ++",
    "subcategory": "accessoire-boost",
    "price": 7500,
    "description": "<p>Une mise à jour de Boost charge +, permettant d'augmenter encore plus les compétences des recharges. Octroie un bonus de +15 Attaque et +15 Attaque spé. lorsque le personnage utilise une recharge.</p>"
  },
  {
    "name": "Boost charge ultime",
    "subcategory": "accessoire-boost",
    "price": 10000,
    "description": "<p>Une mise à jour de Boost charge ++, permettant d'augmenter encore plus les compétences des recharges. Octroie un bonus de +20 Attaque et +20 Attaque spé. lorsque le personnage utilise une recharge.</p>"
  },
  {
    "name": "Power charge",
    "subcategory": "accessoire-power",
    "price": 2000,
    "description": "<p>Un accessoire à ajouter sur une arme afin d'augmenter les dégâts causés par les recharges. Lorsque le personnage utilise une recharge, il reçoit un bonus de +1 Dégâts pour son attaque.</p>"
  },
  {
    "name": "Power charge +",
    "subcategory": "accessoire-power",
    "price": 5000,
    "description": "<p>Une mise à jour de Power charge, augmentant encore plus les dégâts causés par les recharges. Lorsque le personnage utilise une recharge, il reçoit un bonus de +2 Dégâts pour son attaque.</p>"
  },
  {
    "name": "Power charge ++",
    "subcategory": "accessoire-power",
    "price": 7500,
    "description": "<p>Une mise à jour de Power charge +, augmentant encore plus les dégâts causés par les recharges. Lorsque le personnage utilise une recharge, il reçoit un bonus de +4 Dégâts pour son attaque.</p>"
  },
  {
    "name": "Power charge ultime",
    "subcategory": "accessoire-power",
    "price": 10000,
    "description": "<p>Une mise à jour de Power charge ++, augmentant encore plus les dégâts causés par les recharges. Lorsque le personnage utilise une recharge, il reçoit un bonus de +8 Dégâts pour son attaque.</p>"
  },
  {
    "name": "Cage orage",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de projeter un éclair dans le ciel produisant un orage dans toute la zone.</p><p>Consomme une Action bonus pour invoquer la foudre.</p>"
  },
  {
    "name": "Purificateur de sol",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de créer une brise printanière qui vient faire pousser une douce couche d'herbe puriffiante.</p><p>Consomme une Action bonus pour invoquer le champ herbu.</p>"
  },
  {
    "name": "Catalyseur brumeux",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de produire une brume ésotérique.</p><p>Consomme une Action bonus pour invoquer la brume.</p>"
  },
  {
    "name": "Prison psychique",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de créer un champ psychique perturbant tous les personnages ne possédant pas des pouvoirs psychiques.</p><p>Consomme une Action bonus pour invoquer le champ psychique.</p>"
  },
  {
    "name": "Mono-nimbus",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de laisser s'échapper une fumée sombre se dirigeant vers le ciel et faisant tomber la pluie dans la zone.</p><p>Consomme une Action bonus pour invoquer la pluie.</p>"
  },
  {
    "name": "Grenade solaire",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de projeter une grenade dans le ciel produisant un minuscule soleil dont les rayons chauds illuminent la zone.</p><p>Consomme une Action bonus pour invoquer le zénith.</p>"
  },
  {
    "name": "Glace céleste",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de projeter un laser de froid dans le ciel, faisant ainsi tomber la grêle dans la zone.</p><p>Consomme une Action bonus pour invoquer la grêle.</p>"
  },
  {
    "name": "Canon de sable",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de laisser s'échapper une tempête de sable dans toute la zone.</p><p>Consomme une Action bonus pour invoquer la tempête de sable.</p>"
  },
  {
    "name": "Dissipeur gris",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de dissiper la météo actuelle. Attention, cet accessoire n'empêche pas une nouvelle météo d'être active, il dissipe uniquement celle présente.</p><p>Consomme une Action bonus pour retirer la météo actuelle.</p>"
  },
  {
    "name": "Satellite cataclismique",
    "subcategory": "accessoire-meteo",
    "price": 10000,
    "description": "<p>Un accessoire permettant de projeter un petit satellite au-dessus de soit attirant petits cailloux et branches afin de les faire tomber sur toute la zone.</p><p>Consomme une Action bonus pour invoquer la pluie de météores.</p>"
  },
  {
    "name": "Aquarium flottant",
    "subcategory": "accessoire-special",
    "price": 4000,
    "description": "<p>Un accessoire à ajouter sur une arme afin de créer une énorme quantité d'eau lévitant dans l'air, permettant aux Pokémons aquatique de combattre sur la terre ferme. Consomme une recharge de type Eau pour fonctionner.</p>"
  },
  {
    "name": "Pluie océanique",
    "subcategory": "accessoire-special",
    "price": 10000,
    "description": "<p>Une mise à jour de Aquarium flottant, permettant de démultiplier le nombre de bulle utilisé avec une seule recharge. Très utile, elle permettra aux Pokémons aquatiques de sauter de bulle en bulle et de ne plus être limiter sur le terrain par leur petite bulle et les rendant terriblement dangereux.</p>"
  },
  {
    "name": "Anti-charge",
    "subcategory": "accessoire-special",
    "price": 4000,
    "description": "<p>Lorsque cet accessoire est équipé à une arme, il permet à l'arme de ne plus avoir besoin de recharge pour appliquer le type que l'accessoire donne. Néanmoins, lorsqu'il est équipé, l'arme ne peut plus utiliser de recharge.</p>"
  },
  {
    "name": "Knocker barrage",
    "subcategory": "accessoire-special",
    "price": 8000,
    "description": "<p>Un accessoire à ajouter sur un Knocker afin d'empêcher les cibles touchées de pouvoir se déplacer tant que vous êtes au corps à corps avec celle-ci.</p>"
  },
  {
    "name": "Blocker abri",
    "subcategory": "accessoire-special",
    "price": 8000,
    "description": "<p>Un accessoire à ajouter sur un Blocker afin de pouvoir utiliser la réaction de son tour pour pouvoir bloquer complètement une capacité à la manière de la capacité Abri.</p><p>Lorsque vous êtes ciblé par une capacité, vous pouvez utiliser cette capacité. Si vous réussissez votre épreuve de Défense ou de Défense spéciale, vous ne subissez aucun dégât. Consomme une réaction.</p>"
  },
  {
    "name": "Recharge élémentaire",
    "subcategory": "recharge-standard",
    "price": 50,
    "description": "<p>Recharge pour les armes de dresseur, elles permettent de changer le type de l'attaque du dresseur. Sans recharge l'attaque est considérée comme de type Normal mais ne peut pas recevoir le Stab.</p>"
  },
  {
    "name": "Recharge explosive",
    "subcategory": "recharge-standard",
    "price": 200,
    "description": "<p>Recharge n'ayant pas besoin d'arme de dresseur pour être utilisée. Elle inflige obligatoirement des dégâts de Zone 5. Inflige 1D12 Dégâts spéciaux de l'élément de la recharge. Utilise le Talent du dresseur.</p>"
  },
  {
    "name": "Super recharge",
    "subcategory": "recharge-standard",
    "price": 1000,
    "description": "<p>Recharge pour les armes de dresseur, contrairement aux recharges classiques, celles-ci possèdent un concentré de puissance en elle doublant la puissance de celui qui l'utilise.</p>"
  },
  {
    "name": "Hyper recharge",
    "subcategory": "recharge-standard",
    "price": 1000,
    "description": "<p>Recharge pour les armes de dresseur, contrairement aux recharges classiques, celle-ci ne peuvent être parer par la cible.</p>"
  },
  {
    "name": "Ultra recharge",
    "subcategory": "recharge-standard",
    "price": 5000,
    "description": "<p>Recharge pour les armes de dresseur, cette recharge possède une puissance impressionnante capable d'infliger un OHKO lorsqu'elle touche mais le dresseur doit réaliser l'épreuve avec un malus de -50. Le type de la recharge est Normal. Ces recharges sont interdites à l'utilisation selon la loi, on ne les trouve qu'au marché noir.</p>"
  },
  {
    "name": "Recharge paralysante",
    "subcategory": "recharge-statut",
    "price": 750,
    "description": "<p>Recharge pour les armes de dresseur, en plus des dégâts, elle possède une chance sur 4 d'infliger le statut paralysie à la cible si elle touche. Le type de la recharge est Electrique.</p>"
  },
  {
    "name": "Recharge tranquillisante",
    "subcategory": "recharge-statut",
    "price": 750,
    "description": "<p>Recharge pour les armes de dresseur, en plus des dégâts, elle possède une chance sur 4 d'infliger le statut somnolence à la cible si elle touche. Le type de la recharge est Psy.</p>"
  },
  {
    "name": "Recharge brûlante",
    "subcategory": "recharge-statut",
    "price": 750,
    "description": "<p>Recharge pour les armes de dresseur, en plus des dégâts, elle possède une chance sur 4 d'infliger le statut brûlure à la cible si elle touche. Le type de la recharge est Feu.</p>"
  },
  {
    "name": "Recharge gelante",
    "subcategory": "recharge-statut",
    "price": 750,
    "description": "<p>Recgarge pour les armes de dresseur, en plus des dégâts, elle possède une chance sur 4 d'infliger le statut gel à la cible si elle touche. Le type de la recharge est Glace.</p>"
  },
  {
    "name": "Recharge entravante",
    "subcategory": "recharge-statut",
    "price": 750,
    "description": "<p>Recharge pour les armes de dresseur, en plus des dégâts, elle possède une chance sur 4 d'infliger le statut entrave à la cible si elle touche. Le type de la recharge est Sol.</p>"
  },
  {
    "name": "Recharge empoisonnée",
    "subcategory": "recharge-statut",
    "price": 1250,
    "description": "<p>Recharge pour les armes de dresseur, en plus des dégâts, elle inflige le statut empoisonné à la cible si elle touche. Le type de la recharge est Poison. Ces recharges sont interdites à l'utilisation selon la loi, on ne les trouve qu'au marché noir.</p>"
  },
  {
    "name": "Recharge horrible",
    "subcategory": "recharge-statut",
    "price": 2000,
    "description": "<p>Recharge pour les armes de dresseur, en plus des dégâts, elle inflige le statut gravement empoisonné à la cible si elle touche. Le type de la recharge est Poison. Ces recharges sont interdites à l'utilisation selon la loi, on ne les trouve qu'au marché noir.</p>"
  },
  {
    "name": "Recharge envoutante",
    "subcategory": "recharge-statut",
    "price": 2500,
    "description": "<p>Recharge pour les armes de dresseur, en plus des dégâts, elle inflige le statut amoureux à la cible si elle touche et que celle-ci est du sexe opposé. Le type de la recharge est Fée. Ces recharges sont interdites à l'utilisation selon la loi, on ne les trouve qu'au marché noir.</p>"
  }
];
