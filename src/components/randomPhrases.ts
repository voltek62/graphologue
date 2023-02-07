const phrases = [
  // animal
  'bat',
  'bear',
  'bird',
  'cat',
  'cow',
  'deer',
  'dog',
  'dove',
  'dragon',
  'duck',
  'eagle',
  'fish',
  'fox',
  'frog',
  'goose',
  'lion',
  'mouse',
  'owl',
  'pig',
  'rat',
  'seal',
  'shark',
  'sheep',
  'snake',
  'spider',
  'tiger',
  'turkey',
  'viper',
  'whale',
  'wolf',
  // food
  'onion',
  'carrot',
  'pear',
  'bean',
  'corn',
  'bread',
  'apple',
  'banana',
  'fig',
  'grape',
  'lemon',
  'lime',
  'orange',
  'peach',
  'plum',
  'dumpling',
  'cake',
  'pasta',
  'pot',
  'sushi',
]

const randomPhrases = (): string => {
  const randomIndex = Math.floor(Math.random() * phrases.length)
  return phrases[randomIndex]
}

export default randomPhrases
