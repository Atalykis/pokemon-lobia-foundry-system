/** Authored French tabletop weather rules. Types are the Pokémon type keys. */
export const LOBIA_WEATHERS = [
  {
    key: "champ-magnetique", type: "acier", name: "Champ magnétique",
    paragraphs: ["Le champ magnétique est la météo reliée aux Pokémons de type Acier. Lorsque le champ magnétique est actif, les personnages de type Acier se mettent à léviter et sont désormais immunisés aux capacités de type Sol tant que le champ magnétique reste actif."]
  },
  {
    key: "pluie-de-meteores", type: "dragon", name: "Pluie de météores",
    paragraphs: [
      "La pluie de météores est la météo reliée aux Pokémons de type Dragon. Lorsque la pluie de météores est activé, les personnages qui ne sont pas de type Dragon subissent 1D6 Dégâts de recul à la fin de leur tour de jeu. Les attaques de type Dragon reçoivent +5 Dégâts.",
      "L’attaque Draco-météores devient prioritaire."
    ]
  },
  {
    key: "pluie", type: "eau", name: "Pluie",
    paragraphs: [
      "La pluie est la météo reliée aux Pokémons de type Eau. Lorsque la pluie est activé, les attaques de type Eau infligent +5 Dégâts de dégâts alors que celle de type Feu infligent deux fois moins de dégâts.",
      "Les attaques solaires infligent deux fois moins de dégâts alors que les attaques de tempêtes deviennent prioritaires. Les attaques auto-destructrices comme Explosion et Destruction ne s’activent plus."
    ]
  },
  {
    key: "orage", type: "electrik", name: "Orage",
    paragraphs: ["L’orage est la météo reliée aux Pokémons de type Electrique. Lorsque l’orage est actif, les attaques de type Électrique infligent +5 Dégâts et aucun Pokémon ne peut être sous le statut Somnolent."]
  },
  {
    key: "brume", type: "fee", name: "Brume",
    paragraphs: ["La brume est la météo reliée aux Pokémons de type Fée. Lorsque la brume est active, les attaques de type Dragon infligent deux fois moins de dégâts. Les capacités infligeant des problèmes de statut sont désormais inefficaces."]
  },
  {
    key: "zenith", type: "feu", name: "Zénith",
    paragraphs: [
      "Le zénith est la météo reliée aux Pokémons de type Feu. Lorsque le zénith est actif, les attaques de type Feu infligent +5 Dégâts alors que celles de type Eau infligent deux fois moins de dégâts.",
      "Les attaques solaires n’ont pas besoin d’être chargées mais les attaques de tempêtes doivent être réalisées avec une difficulté de -25 supplémentaire. Impossible de subir le statut Gel et tous les personnages souffrant de ce statut sont dégelés à l’invocation du Soleil."
    ]
  },
  {
    key: "grele", type: "glace", name: "Grêle",
    paragraphs: [
      "La grêle est la météo reliée aux Pokémons de type Glace. Lorsque la grêle est active, les personnages qui ne sont pas de type Glace subissent 1D6 Dégâts de recul à la fin de leur tour de jeu. Les attaques de type Glace infligent +5 Dégâts.",
      "Les attaques solaires infligent deux fois moins de dégâts. L’attaque Blizzard devient prioritaire."
    ]
  },
  {
    key: "neige", type: "glace", name: "Neige",
    paragraphs: [
      "Nique la 9G.",
      "La neige est une seconde météo reliée aux Pokémons de type Glace. Lorsque la neige est active, tous les dégâts physiques infligés aux personnages de type Glace sont divisés par 2.",
      "Les attaques solaires infligent deux fois moins de dégâts."
    ]
  },
  {
    key: "champ-de-purete", type: "insecte", name: "Champ de pureté",
    paragraphs: ["Le champ de pureté est la météo reliée aux Pokémons de type Insecte. Lorsque le champ de pureté est actif, les attaques de type Insecte infligent +5 Dégâts. Les attaques de type Feu blessent aussi leur lanceur et infligent 1D6 Dégâts de recul à leur utilisateur. Les attaques Explosion et Destruction obtiennent le type Feu."]
  },
  {
    key: "champ-herbu", type: "plante", name: "Champ herbu",
    paragraphs: ["Le champ herbu est la météo reliée aux Pokémons de type Plante. Lorsque le champ herbu est actif, les attaques de type Plante infligent +5 Dégâts. Les attaques de zone infligent deux fois moins de dégâts. Tous les personnages reçoivent 1D6 Soin à la fin de leur tour tant que le champ herbu est actif. Les personnages de type Plante reçoivent à la place le maximum de soin octroyé par le dé à la fin de leur tour tant que le champ herbu est actif."]
  },
  {
    key: "champ-pollue", type: "poison", name: "Champ pollué",
    paragraphs: ["Le champ pollué est la météo reliée aux Pokémons de type Poison. Lorsque le champ pollué est actif, les personnages qui ne sont pas de type Poison ou Acier sont désormais empoisonnés et ne peuvent pas être soignés tant que le champ pollué est présent. Les personnages de type Poison reçoivent un bonus de +5 Barrière tant que le champ pollué est actif."]
  },
  {
    key: "champ-psychique", type: "psy", name: "Champ psychique",
    paragraphs: ["Le champ psychique est la météo reliée aux Pokémons de type Psy. Lorsque le champ psychique est actif, les attaques de type Psy infligent +5 Dégâts. Les capacités possédant la Priorité ne peuvent pas être utilisées."]
  },
  {
    key: "tempete-de-sable", type: "roche", name: "Tempête de sable",
    paragraphs: [
      "La tempête de sable est la météo reliée aux Pokémons de type Roche. Lorsque la tempête de sable est active, les personnages qui ne sont pas de type Roche, Sol ou Acier subissent 1D4 Dégâts de recul à la fin de leur tour. Les personnages de type Roche reçoivent un bonus de +5 Barrière tant que la tempête de sable est active.",
      "Les attaques solaires infligent deux fois moins de dégâts."
    ]
  },
  {
    key: "secheresse", type: "sol", name: "Sécheresse",
    paragraphs: [
      "La sécheresse est la météo reliée aux Pokémons de type Sol. Lorsque la sécheresse est active, les personnages qui ne sont pas de type Sol ou Roche reçoivent un malus de -10 Général. Les personnages de type Sol sont désormais immunisés aux attaques de type Eau tant que la sécheresse est active.",
      "Les attaques solaires n’ont pas besoin d’être chargées mais les attaques de tempêtes doivent être réalisées avec une difficulté de -25 supplémentaire."
    ]
  },
  {
    key: "porte-des-morts", type: "spectre", name: "Porte des morts",
    paragraphs: ["La porte des morts est la météo reliée aux Pokémons de type Spectre. Lorsque la porte des morts est active, les attaques de type Spectre infligent +5 Dégâts. Les personnages de type Normal perdent leur immunité au type Spectre tant que la porte des morts est activée."]
  },
  {
    key: "nuit", type: "tenebres", name: "Nuit",
    paragraphs: [
      "La nuit est la météo reliée aux Pokémons de type Ténèbres. Lorsque la nuit est activée, tous les personnages qui ne sont pas de type Ténèbres, Spectre ou  Insecte subissent le statut Aveuglement. Les personnages de type Ténèbres reçoivent un bonus de +5 Barrière tant que la nuit est activée.",
      "Les attaques solaires infligent deux fois moins de dégâts."
    ]
  },
  {
    key: "mistral", type: "vol", name: "Mistral",
    paragraphs: [
      "Le mistral est la météo reliée aux Pokémons de type Vol. Lorsque le mistral est actif, les attaques de tous les personnages de type Vol deviennent prioritaires.",
      "Les attaques de tempêtes deviennent prioritaires."
    ]
  }
];
