const fs = require("fs")
const axios = require("axios")

const BASE_URL =
  "https://izmaottvsc14.tvplus.com.tr:33207/EPG/JSON"

const AUTH_URL =
  `${BASE_URL}/Authenticate`

const PLAYBILL_URL =
  `${BASE_URL}/PlayBillList`


function formatDate(date) {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0")

  const day = String(
    date.getDate()
  ).padStart(2, "0")

  const hour = String(
    date.getHours()
  ).padStart(2, "0")

  const minute = String(
    date.getMinutes()
  ).padStart(2, "0")

  const second = String(
    date.getSeconds()
  ).padStart(2, "0")

  return (
    `${year}${month}${day}` +
    `${hour}${minute}${second}`
  )
}


function formatDay(date) {
  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0")

  const day = String(
    date.getDate()
  ).padStart(2, "0")

  return `${year}-${month}-${day}`
}


function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}


function parseTvPlusTime(value) {
  const text =
    String(value || "").trim()

  if (!text) {
    throw new Error(
      "Boş yayın zamanı"
    )
  }

  const match =
    text.match(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+UTC([+-]\d{4})$/
    )

  if (match) {
    const datePart = match[1]
    const timePart = match[2]
    const offset = match[3]

    const isoOffset =
      `${offset.slice(0, 3)}:${offset.slice(3)}`

    return new Date(
      `${datePart}T${timePart}${isoOffset}`
    )
  }

  const parsed =
    new Date(text)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Geçersiz TV+ zamanı: ${text}`
    )
  }

  return parsed
}


function xmltvTime(date) {
  const year =
    date.getUTCFullYear()

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0")

  const day =
    String(
      date.getUTCDate()
    ).padStart(2, "0")

  const hour =
    String(
      date.getUTCHours()
    ).padStart(2, "0")

  const minute =
    String(
      date.getUTCMinutes()
    ).padStart(2, "0")

  const second =
    String(
      date.getUTCSeconds()
    ).padStart(2, "0")

  return (
    `${year}${month}${day}` +
    `${hour}${minute}${second} +0000`
  )
}


async function authenticate() {
  console.log(
    "TV+ Authenticate yapılıyor..."
  )

  const response =
    await axios.post(
      AUTH_URL,
      {
        terminaltype: "webtv",

        terminalvendor:
          "5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/103.0.0.0 Safari/537.36",

        osversion: "Win32",

        userType: "3",

        utcEnable: "1",

        timezone:
          "Europe/Istanbul"
      },
      {
        validateStatus: () => true
      }
    )

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw new Error(
      `Authenticate başarısız: HTTP ${response.status}`
    )
  }

  let cookies = []

  if (
    typeof response.headers.getSetCookie ===
    "function"
  ) {
    cookies =
      response.headers.getSetCookie()
  } else if (
    response.headers["set-cookie"]
  ) {
    cookies =
      response.headers["set-cookie"]
  }

  if (!cookies.length) {
    throw new Error(
      "Authenticate cookie döndürmedi."
    )
  }

  const cookieHeader =
    cookies
      .map(cookie =>
        cookie.split(";")[0]
      )
      .join("; ")

  console.log(
    "Authenticate başarılı."
  )

  return cookieHeader
}


async function getPlaybill(
  channelId,
  beginTime,
  endTime,
  cookie
) {
  const response =
    await axios.post(
      PLAYBILL_URL,
      {
        type: "2",

        channelid:
          String(channelId),

        begintime:
          beginTime,

        endtime:
          endTime,

        isFillProgram: 1
      },
      {
        headers: {
          Cookie: cookie,

          "User-Agent":
            "Mozilla/5.0 " +
            "(Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 " +
            "(KHTML, like Gecko) " +
            "Chrome/103.0.0.0 Safari/537.36",

          Referer:
            "https://tvplus.com.tr/"
        },

        timeout: 30000,

        validateStatus:
          () => true
      }
    )

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw new Error(
      `PlayBillList HTTP ${response.status}`
    )
  }

  return response.data
}


function findChannelXmltvId(channelId) {
  const map = {
    "124": "ATV.tr@SD",
    "144": "TRT1.tr@SD",
    "30": "TRTHaber.tr@SD",
    "31": "TRTSpor.tr@SD",
    "21": "TRTBelgesel.tr@SD",
    "99": "TRTCocuk.tr@SD",
    "83": "TRT2.tr@SD",
    "159": "TRTMuzik.tr@SD",
    "193": "TRTAvaz.tr@SD",
    "156": "TRTTurk.tr@SD",

    "88": "KanalD.tr@SD",
    "89": "StarTV.tr@SD",
    "130": "ShowTV.tr@SD",
    "93": "NOWTV.tr@SD",
    "134": "TV8.tr@SD",
    "188": "TV85.tr@SD",
    "81": "NTV.tr@SD",
    "158": "CNNTurk.tr@SD",

    "166": "SinemaTV.tr@SD",
    "199": "Sinema2.tr@SD",
    "129": "SinemaAksiyon.tr@SD",
    "154": "SinemaKomedi.tr@SD",
    "155": "SinemaAile.tr@SD",
    "181": "Sinema1001.tr@SD",
    "190": "Sinema1002.tr@SD",

    "180": "DMAX.tr@SD",
    "174": "TLC.tr@SD",
    "8": "DiscoveryChannel.tr@SD",
    "2799": "NationalGeographic.tr@SD",
    "139": "NationalGeographicWild.tr@SD",

    "79": "APara.tr@SD",
    "160": "AHaber.tr@SD",
    "101": "ANews.tr@SD",
    "3": "ASpor.tr@SD",

    "86": "360.tr@SD",
    "32": "24TV.tr@SD",
    "34": "TGRTHaber.tr@SD",
    "87": "HaberturkTV.tr@SD",
    "90": "Kanal7.tr@SD",
    "100": "Ekoturk.tr@SD",
    "92": "TVNET.tr@SD",
    "145": "UlkeTV.tr@SD",
    "179": "TV100.tr@SD",

    "96": "BloombergHT.tr@SD",
    "95": "Teve2.tr@SD",
    "153": "DreamTurk.tr@SD",
    "189": "Tele1.tr@SD",
    "91": "HalkTV.tr@SD",

    "11": "SSport.tr@SD",
    "170": "SSport2.tr@SD",
    "173": "SportsTV.tr@SD",
    "18": "NBATVInternational.us@SD"
  }

  return (
    map[String(channelId)] ||
    `tvplus-${channelId}`
  )
}


async function main() {
  console.log(
    "========================================"
  )

  console.log(
    "TV+ EPG BAŞLIYOR"
  )

  console.log(
    "========================================"
  )

  const cookie =
    await authenticate()

  const now =
    new Date()

  /*
   BUGÜN + SONRAKİ 2 GÜN
   TOPLAM 3 GÜN
  */

  const days = []

  for (let i = 0; i < 3; i++) {
    days.push(
      new Date(
        now.getTime() +
        i * 24 * 60 * 60 * 1000
      )
    )
  }

  const allPrograms = []
  const channelNames = {}

  for (
    const day of days
  ) {
    const beginTime =
      formatDate(
        new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          0,
          0,
          0
        )
      )

    const endTime =
      formatDate(
        new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate() + 1,
          0,
          0,
          0
        )
      )

    console.log(
      `Gün: ${formatDay(day)}`
    )

    const channelIds =
      Object.keys(
        CHANNEL_MAP
      )

    for (
      const channelId of channelIds
    ) {
      try {
        const data =
          await getPlaybill(
            channelId,
            beginTime,
            endTime,
            cookie
          )

        const items =
          Array.isArray(
            data?.playbilllist
          )
            ? data.playbilllist
            : []

        if (!items.length) {
          continue
        }

        const xmltvId =
          findChannelXmltvId(
            channelId
          )

        channelNames[channelId] =
          CHANNEL_MAP[
            channelId
          ].name

        for (
          const item of items
        ) {
          if (
            !item ||
            !item.starttime ||
            !item.endtime
          ) {
            continue
          }

          const title =
            String(
              item.name || ""
            ).trim()

          if (!title) {
            continue
          }

          const start =
            parseTvPlusTime(
              item.starttime
            )

          const stop =
            parseTvPlusTime(
              item.endtime
            )

          allPrograms.push({
            channel: channelId,
            xmltvId,
            title,

            description:
              String(
                item.introduce || ""
              ).trim(),

            category:
              String(
                item.genres || ""
              ).trim(),

            icon:
              typeof item?.picture?.icon ===
              "string"
                ? item.picture.icon
                    .split(",")[0]
                : null,

            image:
              item?.picture?.still ||
              null,

            start,
            stop
          })
        }

      } catch (error) {
        console.log(
          `Kanal ${channelId} hatası:`,
          error.message
        )
      }
    }
  }

  if (!allPrograms.length) {
    throw new Error(
      "Hiç TV+ programı alınamadı."
    )
  }

  const uniquePrograms =
    new Map()

  for (
    const program of allPrograms
  ) {
    const key =
      [
        program.channel,
        program.start.getTime(),
        program.stop.getTime(),
        program.title
      ].join("|")

    uniquePrograms.set(
      key,
      program
    )
  }

  const programs =
    Array.from(
      uniquePrograms.values()
    )

  programs.sort(
    (a, b) =>
      a.start.getTime() -
      b.start.getTime()
  )

  const xml = []

  xml.push(
    '<?xml version="1.0" encoding="UTF-8"?>'
  )

  xml.push(
    '<tv generator-info-name="TV+ EPG">'
  )

  const usedIds =
    [
      ...new Set(
        programs.map(
          p => p.xmltvId
        )
      )
    ].sort()

  for (
    const xmltvId of usedIds
  ) {
    const program =
      programs.find(
        p =>
          p.xmltvId === xmltvId
      )

    if (!program) {
      continue
    }

    const channelName =
      channelNames[
        program.channel
      ] ||
      program.channel

    xml.push(
      `  <channel id="${escapeXml(xmltvId)}">`
    )

    xml.push(
      `    <display-name lang="tr">` +
      `${escapeXml(channelName)}` +
      `</display-name>`
    )

    xml.push(
      "  </channel>"
    )
  }

  for (
    const program of programs
  ) {
    xml.push(
      `  <programme ` +
      `start="${xmltvTime(program.start)}" ` +
      `stop="${xmltvTime(program.stop)}" ` +
      `channel="${escapeXml(program.xmltvId)}">`
    )

    xml.push(
      `    <title lang="tr">` +
      `${escapeXml(program.title)}` +
      `</title>`
    )

    if (program.description) {
      xml.push(
        `    <desc lang="tr">` +
        `${escapeXml(
          program.description
        )}` +
        `</desc>`
      )
    }

    if (program.category) {
      for (
        const category of
        program.category.split("/")
      ) {
        const value =
          category.trim()

        if (value) {
          xml.push(
            `    <category lang="tr">` +
            `${escapeXml(value)}` +
            `</category>`
          )
        }
      }
    }

    if (program.icon) {
      xml.push(
        `    <icon src="${escapeXml(
          program.icon
        )}" />`
      )
    }

    if (program.image) {
      xml.push(
        `    <image src="${escapeXml(
          program.image
        )}" />`
      )
    }

    xml.push(
      "  </programme>"
    )
  }

  xml.push(
    "</tv>"
  )

  fs.writeFileSync(
    "tvplus.xml",
    xml.join("\n") + "\n",
    "utf8"
  )

  console.log(
    "========================================"
  )

  console.log(
    "TV+ EPG BAŞARIYLA OLUŞTURULDU"
  )

  console.log(
    `Program: ${programs.length}`
  )

  console.log(
    `Kanal: ${usedIds.length}`
  )

  console.log(
    "Gün sayısı: 3"
  )

  console.log(
    "========================================"
  )
}


const CHANNEL_MAP = {

  "2": { name: "A2" },
  "3": { name: "A SPOR" },
  "8": { name: "DISCOVERY CHANNEL" },
  "11": { name: "S SPORT" },
  "18": { name: "NBA TV" },
  "21": { name: "TRT BELGESEL" },
  "30": { name: "TRT HABER" },
  "31": { name: "TRT SPOR" },
  "32": { name: "24" },
  "34": { name: "TGRT HABER" },
  "81": { name: "NTV" },
  "83": { name: "TRT 2" },
  "87": { name: "HABERTÜRK" },
  "88": { name: "KANAL D" },
  "89": { name: "STAR TV" },
  "90": { name: "KANAL 7" },
  "91": { name: "HALK TV" },
  "93": { name: "NOW" },
  "95": { name: "TEVE2" },
  "96": { name: "BLOOMBERG HT" },
  "99": { name: "TRT ÇOCUK" },
  "100": { name: "EKOTÜRK" },
  "101": { name: "A NEWS" },
  "124": { name: "ATV" },
  "129": { name: "SİNEMA TV AKSİYON" },
  "130": { name: "SHOW TV" },
  "134": { name: "TV8" },
  "144": { name: "TRT1" },
  "145": { name: "ÜLKE TV" },
  "153": { name: "DREAM TÜRK" },
  "154": { name: "SİNEMA KOMEDİ" },
  "155": { name: "SİNEMA AİLE" },
  "156": { name: "TRT TÜRK" },
  "158": { name: "CNN TÜRK" },
  "159": { name: "TRT MÜZİK" },
  "160": { name: "A HABER" },
  "166": { name: "SİNEMA TV" },
  "170": { name: "S SPORT 2" },
  "173": { name: "SPORTS TV" },
  "174": { name: "TLC" },
  "179": { name: "TV100" },
  "180": { name: "DMAX" },
  "181": { name: "SİNEMA TV 1001" },
  "188": { name: "TV8,5" },
  "189": { name: "TELE1" },
  "190": { name: "SİNEMA 1002" },
  "193": { name: "TRT AVAZ" },
  "199": { name: "SİNEMA TV 2" },
  "2799": { name: "NATIONAL GEOGRAPHIC" }
}


main().catch(error => {
  console.error(
    "TV+ EPG HATASI:"
  )

  console.error(error)

  process.exit(1)
})
