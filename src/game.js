let game;

// global game options
let gameOptions = {
    platformStartSpeed: 350,
    spawnRange: [100, 350],
    platformSizeRange: [30, 250],
    playerGravity: 1500,
    jumpForce: 700,
    playerStartPosition: 200,
    jumps: 3
}

window.onload = function() {

    // object containing configuration options
    let gameConfig = {
        type: Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: playGame,
        backgroundColor: 0x444444,

        // physics settings
        physics: {
            default: "arcade"
        }
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
}

// playGame scene
class playGame extends Phaser.Scene{
    constructor(){
        super("PlayGame");
    }
    preload(){
        this.load.image("platform", "./assets/sprites/platform.png");
        this.load.image("player", "./assets/sprites/player.png");
        this.load.audio("first", "./assets/SFX/first.mp3")
        this.load.audio("second", "./assets/SFX/second.mp3")
        this.load.image("background", "./assets/sprites/background.png")
    }
    
    create(){
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.gameOver = false;

        this.mostSeconds = 0;

        this.background = this.add.tileSprite(0, 0, 1334, 750, 'background').setOrigin(0, 0);
        // group with all active platforms.
        this.platformGroup = this.add.group({

            // once a platform is removed, it's added to the pool
            removeCallback: function(platform){
                platform.scene.platformPool.add(platform)
            }
        });

        // pool
        this.platformPool = this.add.group({

            // once a platform is removed from the pool, it's added to the active platforms group
            removeCallback: function(platform){
                platform.scene.platformGroup.add(platform)
            }
        });

        // number of consecutive jumps made by the player
        this.playerJumps = 0;

        // adding a platform to the game, the arguments are platform width and x position
        this.addPlatform(game.config.width, game.config.width / 2);

        // adding the player;
        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height / 2, "player");
        this.player.setGravityY(gameOptions.playerGravity);

        // setting collisions between the player and the platform group
        this.physics.add.collider(this.player, this.platformGroup);

        // checking for input
        this.input.on("pointerdown", this.jump, this);

        let timeElapsedConfig = {
            fontFamily: 'Lucida Console',
            fontSize: '32px',
            backgroundColor: '#171717',
            color: '#FFFFFFFF',
            align:'right',
            padding: {
                top: 5,
                bottom: 5,
                left: 5,
                right: 5,
            },
            fixedWidth: 0
        }
        this.highScoreNumber = 0;
        this.highScoreText = this.add.text(game.config.width / 1.29, game.config.height * 0.0001, localStorage.getItem("HighScore") + ":Longest Time", timeElapsedConfig);
        this.scoreText = this.add.text(this.player.posX, this.player.posY, 'Time:', timeElapsedConfig);
        this.scoreCounter = this.time.addEvent({ delay: 99999999999, callback: this.onClockEvent, callbackScope: this, repeat: 1 });
        this.secondsElapsed = this.scoreCounter.getElapsedSeconds()
    }

    // the core of the script: platform are added from the pool or created on the fly
    addPlatform(platformWidth, posX){
        let platform;
        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
        }
        else{
            platform = this.physics.add.sprite(posX, game.config.height * 0.8, "platform");
            platform.setImmovable(true);
            platform.setVelocityX(gameOptions.platformStartSpeed * -1);
            this.platformGroup.add(platform);
        }
        platform.displayWidth = platformWidth;
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
    }

    // the player jumps when on the ground, or once in the air as long as there are jumps left and the first jump was on the ground
    jump(){
        if(this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)){
            if(this.player.body.touching.down){
                this.playerJumps = 0;
            }
            this.player.setVelocityY(gameOptions.jumpForce * -1);
            this.playerJumps +=1;

            if (this.playerJumps > 1) {
                this.sound.play("second", {volume: 0.1});
            }
            else {
                this.sound.play("first", {volume: 0.1});
              }

            
            
        }
    }
    
    update(){

        this.background.tilePositionX += 1;
        if(gameOptions.playerStartPosition < 365){
            gameOptions.platformStartSpeed += .5;
        }
        
        if(gameOptions.platformSizeRange[1] > 50){
            gameOptions.platformSizeRange[1] -= .005;
        }
        

        if(this.player.y < game.config.height){
            //console.log(this.seconds.getElapsedSeconds());
            this.scoreText.setText('SCORE: ' + parseInt(10 * this.scoreCounter.getElapsedSeconds()) + '0');
        }

        // game over
        if(this.player.y > game.config.height){
            this.highScore();
            this.gameOver = true;
            console.log(this.highScoreNumber)
            this.add.text(game.config.width/2 , game.config.height/2, 'GAME OVER',).setOrigin(0.5);
            this.add.text(game.config.width/2 , game.config.height/2 + 64, 'Press SPACE to restart',).setOrigin(0.5);
            
        }

        //this.scene.restart("PlayGame");
        if(this.gameOver && Phaser.Input.Keyboard.JustDown(this.spacebar)){
            this.scene.start("PlayGame");
            gameOptions.platformStartSpeed = 350;
            gameOptions.platformSizeRange = [120, 250];
        
        }

        this.player.x = gameOptions.playerStartPosition;

        // recycling platforms
        let minDistance = game.config.width;
        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            minDistance = Math.min(minDistance, platformDistance);
            
            if(platform.x < - platform.displayWidth / 2){
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // adding new platforms
        if(minDistance > this.nextPlatformDistance){
            var nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2);
        }
    };

    highScore() { 
        if (this.secondsElapsed > localStorage.getItem("HighScore")) {
            this.highScoreNumber = this.secondsElapsed
            localStorage.setItem("HighScore", this.highScoreNumber);
            this.highScoreText.text = localStorage.getItem("HighScore") + ":High Score";
            console.log(this.highScoreNumber)
        }
     };
};
function resize(){
    let canvas = document.querySelector("canvas");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = game.config.width / game.config.height;
    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else{
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}