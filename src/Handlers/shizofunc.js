const {
  proto,
  generateWAMessage,
  areJidsSameUser,
  generateWAMessageFromContent,
  prepareWAMessageMedia
} = require('@adiwajshing/baileys');


// SettingUp Quick Buttons ShortCuts Here 

/* 
Sending Buttons Functions By ® Shizo The Techie	

[| New Quick_Reply WhatsApp Buttons |]
----------------------->
@Read More about this 
         🖇️ https://dev.to/shizo_the_techie/whatsapp-quickreply-and-list-buttons-baileys-library-buttons-patch-and-message-filterization-455l
   
   Article by © Shizo The Techie 
    */


//Single Quick Buttons 
const shizobtn1 = async (client, from, text, btntxt, btnid, footer) => {
  let msg = generateWAMessageFromContent(`${from}`, {
    viewOnceMessage: {
      message: {
        "messageContextInfo": {
          "deviceListMetadata": {},
          "deviceListMetadataVersion": 2
        },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({
            text: `${text}`
          }),
          footer: proto.Message.InteractiveMessage.Footer.create({
            text: `${footer}`
          }),
          header: proto.Message.InteractiveMessage.Header.create({
            title: "",
            subtitle: "",
            hasMediaAttachment: false
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                "name": "quick_reply",
                "buttonParamsJson": `{"display_text":"${btntxt}","id":"${btnid}"}`
              }
            ],
          })
        })
      }
    }
  }, {})

  await client.relayMessage(msg.key.remoteJid, msg.message, {
    messageId: msg.key.id
  })
}

//Single Quick Button with Image 
const shizobtn1img = async (client, from, text, img, btntxt, btnid, footer) => {
  let msg = generateWAMessageFromContent(`${from}`, {
    viewOnceMessage: {
      message: {
        "messageContextInfo": {
          "deviceListMetadata": {},
          "deviceListMetadataVersion": 2
        },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({
            text: `${text}`
          }),
          footer: proto.Message.InteractiveMessage.Footer.create({
            text: `${footer}`
          }),
          header: proto.Message.InteractiveMessage.Header.create({
            ...(await prepareWAMessageMedia({ image: { url: `${img}` } }, { upload: client.waUploadToServer })),
            title: "",
            subtitle: "",
            hasMediaAttachment: false
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                "name": "quick_reply",
                "buttonParamsJson": `{"display_text":"${btntxt}","id":"${btnid}"}`
              }
            ],
          })
        })
      }
    }
  }, {})

  await client.relayMessage(msg.key.remoteJid, msg.message, {
    messageId: msg.key.id
  })
}


//Single Quick Button with Gif Buffer
const shizobtn1gif = async (client, from, text, img, btntxt, btnid, footer) => {
  let msg = generateWAMessageFromContent(`${from}`, {
    viewOnceMessage: {
      message: {
        "messageContextInfo": {
          "deviceListMetadata": {},
          "deviceListMetadataVersion": 2
        },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({
            text: `${text}`
          }),
          footer: proto.Message.InteractiveMessage.Footer.create({
            text: `${footer}`
          }),
          header: proto.Message.InteractiveMessage.Header.create({
            ...(await prepareWAMessageMedia({ video: { url: `${img}` } }, { upload: client.waUploadToServer })),
            title: "",
            subtitle: "",
            gifPlayback: true,
            hasMediaAttachment: false
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                "name": "quick_reply",
                "buttonParamsJson": `{"display_text":"${btntxt}","id":"${btnid}"}`
              }
            ],
          })
        })
      }
    }
  }, {})

  await client.relayMessage(msg.key.remoteJid, msg.message, {
    messageId: msg.key.id
  })
}


module.exports = {
  shizobtn1,
  shizobtn1img,
  shizobtn1gif
}
