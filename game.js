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

function preload() {
    // Load game assets
    this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.image('cloud', 'https://labs.phaser.io/assets/sprites/cloud.png');
    this.load.spritesheet('hen', 'https://labs.phaser.io/assets/sprites/dude.png', { 
        frameWidth: 32, 
        frameHeight: 48 
    });
}

function create() {
    // Add background
    this.add.image(400, 300, 'sky');

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

    // Create platforms group
    platforms = this.physics.add.staticGroup();

    // Create ground and platforms
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

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

    // Add collision between hen and platforms
    this.physics.add.collider(hen, platforms);

    // Add score text
    scoreText = this.add.text(16, 16, 'Score: 0', { 
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
            // Make hen jump higher based on scream duration
            hen.setVelocityY(-300 - Math.min(screamDuration * 5, 200));
            score += 10;
            scoreText.setText('Score: ' + score);

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
    // Request microphone access
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
