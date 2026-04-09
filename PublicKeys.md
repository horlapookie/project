## 🌸 How to add key values in `.env` file?

- Rename `.env.example` to `.env` and fill in the required details in `.env` file(Mandatory).

```
NAME=Aurora
PREFIX=:
MODS=91896133xxxx,91790357xxxx
PORT=3000
WRITE_SONIC= write sonic api key
BG_API_KEY= remove backgroun api key
openAi= openai api key
SESSION=Hiii
URL=mongodb+srv://<your_mongoDB_username>:<your_mongoDB_password>@cluster0.vwjrj53.mongodb.net/?retryWrites=true&w=majority
SESSION_URL= same as url

```

<br>

### 🌸 Name:
- Here you have to put the name of the bot that will display.
- for example: aurora
 
<br>

### 🌚 Prefix: 

- You can use any prefix you want like: `#` or `!` or `.` etc.
- Don't use `@` or any alphabets or numbers as prefix as it will cause issues.

<br>

### 🌸 Mods( REQUIRED ):
- Mods are the people who can use `mod` commands like: `ban`, `unban`, `enable`, `disable`, `eval`, `setmoney` etc,- In other words they are Maintainers of the bot.
- You can add multiple mods by separating their numbers with `,` like: `918961331275` etc. where `91` is country code and `8961331275` is phone number. ( Do not use international format like: `+91 8961331275` or `+918961331275` etc. And also do not use `0` before country code like: `0918961331275` etc.)

<br>

### 🌸 port( REQUIRED ):
- this is the port number on which youe bot will run
- for example: 3000 
 
<br>

### 🌸 write sonic key:
- This is write sonic key for our bot
- use your own write sonic key
 
<br>

### 🌸  bg api key:
- This is the bg api key for our bot which is used for remove bg feature
- use your own remove bg key
 
<br>

### 🌸  openAI key:
- This is the openai key for our bot which is used for chat gpt feature
- use your own open AI key
 
<br>

### 💫 Session ( Must be changed everytime to get new qr code ):

- You can use any random string as `SESSION` value like: `abcd123` or `aa` etc.
- You can also use your name as `SESSION` value like: `shisui` or `lucky-0` etc.
- Node: You must change `SESSION` value if you want to `login again` with `new qr` code.

<br>

### 🌸 MongoDB URL ( REQUIRED ):

```
mongodb+srv://<your_mongoDB_username>:<your_mongoDB_password>@cluster0.vwjrj53.mongodb.net/?retryWrites=true&w=majority
```
- this is our bots official public db url here all users data are stored
- we perefer to say use your own mongo url for privacy

<br>

### ⚜️ session url ( REQUIRED ):

```
same as url
```
