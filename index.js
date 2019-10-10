'use strict'

const cheerio = require('cheerio')
const cloudscraper = require('cloudscraper')
const firebaseAdmin = require("firebase-admin")
const serviceAccount = require("./serviceAccountKey.json")
const url = 'https://www.tibia.com/community/?subtopic=killstatistics&world=Celesta'

class Monster {
    constructor(name, seenYesterday) {
        this.name = name
        this.seenYesterday = seenYesterday
    }
}

const interestingBossNames = [
    // Bosses
    'white pale',
    'rotworm queen',
    'hirintror',
    'hatebreeder',
    'fernfang',
    'man in the cave',
    'zulazza the corruptor',
    'dharalion',
    'general murius',
    'the pale count',
    'orshabaal',
    'ferumbras',
    'morgaroth',
    'ghazbaran',
    'shlorg',
    'weakened shlorg',
    'the welter',
    'tyrn',
    'zushuka',

    // Rosh bosses
    'gazaragoth',
    'omrafir',

    // PoI bosses
    'countess sorrow',
    'mr punish',
    'the handmaiden',
    'the plasmother',
    'dracola',
    'massacre',
    'the imperor',

    // Rare monsters
    'undead cavebears',
    'midnight panthers',
    'draptors',
    'crustaceae giganticae',

    // Vampire bosses
    'arachir the ancient one',
    'arthei',
    'boreth',
    'diblis the fair',
    'lersatio',
    'marziel',
    'shadow of boreth',
    'shadow of lersatio',
    'shadow of marziel',
    'sir valorcrest',
    'zevelon duskbringer',
]

const init = () => {
    firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
            "projectId": process.env.FIREBASE_PROJECT_ID,
            "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            "clientEmail": process.env.FIREBASE_CLIENT_EMAIL,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    })

    update()
}

const update = (cb) => {
    cloudscraper(url).then(
        data => {
            const monsters = parseMonsters(data)

            saveToDatabase(monsters)
        },
        err => console.error(err)
    )
}

const parseMonsters = (data) => {
    const $ = cheerio.load(data)
    const tableRows = $('form > table tr')
    let monsters = []

    tableRows.each((i, elem) => {
        const element = $(elem)
        const monsterName = element.find('td').first().text().trim()
        const seenYesterday = Number.parseInt(element.find('td').eq(1).text()) > 0 || Number.parseInt(element.find('td').eq(2).text()) > 0

        if (interestingBossNames.indexOf(monsterName.toLowerCase().trim()) !== -1) {
            monsters.push(new Monster(monsterName.toLowerCase().trim(), seenYesterday))
        }
    })

    return monsters
}

const saveToDatabase = (monsters) => {
    const db = firebaseAdmin.database()
    const monstersRef = db.ref("monsters")

    monstersRef.once('value', (data => {
        const currentArray = data.val()
        const seenYesterdayNames = monsters
            .filter(monster => monster.seenYesterday)
            .map(monster => monster.name)

        const updatedArray = currentArray.map(monster => {
            if (seenYesterdayNames.indexOf(monster.name) !== -1) {
                return {
                    name: monster.name,
                    lastSeen: 1,
                }
            } else {
                return {
                    name: monster.name,
                    lastSeen: Number.parseInt(monster.lastSeen) + 1,
                }
            }
        })

        monstersRef
            .set(updatedArray)
            .then(() => {
                process.exit()
            })
    }))
}

init()