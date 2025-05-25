const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'gameContainer',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let hen;
let platforms;
let score = 0;
let scoreText;
let audioContext;
let analyser;
let dataArray;
let isScreaming = false;
let screamDuration = 0;
let screamThreshold = 100;
let screamIndicator;
let clouds;
let stars;
let level = 1;
let levelText;
let coins;
let coinSound;
let backgroundMusic;
let currentLevel = 1;
let maxLevel = 3;

const levelConfig = {
    1: {
        platforms: [
            { x: 400, y: 568, scale: 2 },
            { x: 600, y: 400 },
            { x: 50, y: 250 },
            { x: 750, y: 220 }
        ],
        background: 'sky1',
        coinsCount: 5
    },
    2: {
        platforms: [
            { x: 400, y: 568, scale: 2 },
            { x: 600, y: 450 },
            { x: 200, y: 350 },
            { x: 50, y: 250 },
            { x: 750, y: 200 }
        ],
        background: 'sky2',
        coinsCount: 8
    },
    3: {
        platforms: [
            { x: 400, y: 568, scale: 2 },
            { x: 600, y: 450 },
            { x: 200, y: 350 },
            { x: 50, y: 250 },
            { x: 750, y: 200 },
            { x: 400, y: 150 },
            { x: 100, y: 100 }
        ],
        background: 'sky3',
        coinsCount: 10
    }
};

function preload() {
    // Load game assets
    this.load.image('sky1', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('sky2', 'https://labs.phaser.io/assets/skies/deep-space.png');
    this.load.image('sky3', 'https://labs.phaser.io/assets/skies/nebula.png');
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.image('cloud', 'https://labs.phaser.io/assets/sprites/cloud.png');
    this.load.image('star', 'https://labs.phaser.io/assets/sprites/star.png');
    this.load.image('coin', 'https://labs.phaser.io/assets/sprites/coin.png');
    this.load.spritesheet('hen', 'https://labs.phaser.io/assets/sprites/dude.png', { 
        frameWidth: 32, 
        frameHeight: 48 
    });
    this.load.audio('coin_sound', 'https://labs.phaser.io/assets/audio/coin.wav');
    this.load.audio('background_music', 'https://labs.phaser.io/assets/audio/theme.mp3');
}

function createLevel(level) {
    // Clear existing objects
    if (platforms) platforms.clear(true, true);
    if (coins) coins.clear(true, true);
    if (clouds) clouds.clear(true, true);

    // Set background
    this.add.image(400, 300, levelConfig[level].background);

    // Create platforms
    platforms = this.physics.add.staticGroup();
    levelConfig[level].platforms.forEach(platform => {
        const plat = platforms.create(platform.x, platform.y, 'ground');
        if (platform.scale) plat.setScale(platform.scale).refreshBody();
    });

    // Create coins
    coins = this.physics.add.group();
    for (let i = 0; i < levelConfig[level].coinsCount; i++) {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(50, 450);
        const coin = coins.create(x, y, 'coin');
        coin.setBounceY(0.4);
        coin.setCollideWorldBounds(true);
    }

    // Add clouds
    clouds = this.add.group();
    for (let i = 0; i < 5; i++) {
        const x = Phaser.Math.Between(0, 800);
        const y = Phaser.Math.Between(50, 300);
        const cloud = clouds.create(x, y, 'cloud');
        cloud.setScale(0.5);
        cloud.alpha = 0.7;
        cloud.speed = Phaser.Math.Between(0.5, 2);
    }

    // Reset hen position
    hen.setPosition(100, 450);

    // Update level text
    levelText.setText('Level: ' + level);

    // Add colliders
    this.physics.add.collider(hen, platforms);
    this.physics.add.collider(coins, platforms);
    this.physics.add.overlap(hen, coins, collectCoin, null, this);
}

function create() {
    // Add sounds
    coinSound = this.sound.add('coin_sound');
    backgroundMusic = this.sound.add('background_music', { loop: true, volume: 0.5 });
    backgroundMusic.play();

    // Create hen sprite
    hen = this.physics.add.sprite(100, 450, 'hen');
    hen.setBounce(0.2);
    hen.setCollideWorldBounds(true);

    // Hen animations
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('hen', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [{ key: 'hen', frame: 4 }],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('hen', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // Add score and level text
    scoreText = this.add.text(16, 16, 'Score: 0', { 
        fontSize: '32px', 
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 4
    });

    levelText = this.add.text(16, 56, 'Level: 1', {
        fontSize: '32px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 4
    });

    // Add scream indicator
    screamIndicator = this.add.rectangle(700, 30, 100, 20, 0x00ff00);
    screamIndicator.alpha = 0;

    // Initialize audio context
    initAudio();

    // Create initial level
    createLevel.call(this, currentLevel);
}

function collectCoin(hen, coin) {
    coin.destroy();
    coinSound.play();
    score += 10;
    scoreText.setText('Score: ' + score);

    // Check if level is complete
    if (coins.countActive(true) === 0) {
        if (currentLevel < maxLevel) {
            currentLevel++;
            createLevel.call(this, currentLevel);
        } else {
            // Game complete
            this.add.text(400, 300, 'Congratulations!\nYou completed all levels!', {
                fontSize: '48px',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5);
            this.physics.pause();
        }
    }
}

function update() {
    const cursors = this.input.keyboard.createCursorKeys();

    // Move clouds
    clouds.children.iterate(function(cloud) {
        cloud.x += cloud.speed;
        if (cloud.x > 850) {
            cloud.x = -50;
            cloud.y = Phaser.Math.Between(50, 300);
        }
    });

    // Handle horizontal movement
    if (cursors.left.isDown) {
        hen.setVelocityX(-160);
        hen.anims.play('left', true);
    } else if (cursors.right.isDown) {
        hen.setVelocityX(160);
        hen.anims.play('right', true);
    } else {
        hen.setVelocityX(0);
        hen.anims.play('turn');
    }

    // Handle scream-based jumping
    if (audioContext && analyser) {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (average > screamThreshold) {
            if (!isScreaming) {
                isScreaming = true;
                screamDuration = 0;
            }
            screamDuration++;
            hen.setVelocityY(-300 - Math.min(screamDuration * 5, 200));

            // Update scream indicator
            screamIndicator.alpha = 1;
            screamIndicator.width = Math.min(100, screamDuration);
            screamIndicator.fillColor = 0x00ff00 + (Math.min(screamDuration, 100) * 0x000100);
        } else {
            isScreaming = false;
            screamDuration = 0;
            screamIndicator.alpha = 0.3;
        }
    }
}

function initAudio() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        })
        .catch(err => {
            console.error('Error accessing microphone:', err);
            alert('Please allow microphone access to play the game!');
        });
}