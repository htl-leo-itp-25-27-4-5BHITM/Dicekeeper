// Global state for attributes and budget
let totalPoints = 27;
let usedPoints = 0;
const attributes = [
  { name: "Strength", points: 0 },
  { name: "Dexterity", points: 0 },
  { name: "Constitution", points: 0 },
  { name: "Intelligence", points: 0 },
  { name: "Wisdom", points: 0 },
  { name: "Charisma", points: 0 }
];

// Function to create the attribute inputs
function createAttributeInputs() {
  const attributesContainer = document.getElementById('attributesAbility');
  attributesContainer.innerHTML = ''; // Clear the container

  attributes.forEach((attr, index) => {
    const row = document.createElement('div');
    row.classList.add('rowAbility');

    const attrName = document.createElement('div');
    attrName.classList.add('attrNameAbility');
    attrName.textContent = attr.name;

    const controls = document.createElement('div');
    controls.classList.add('controlsAbility');

    // Input for points
    const input = document.createElement('input');
    input.type = 'number';
    input.value = attr.points;
    input.min = 0;
    input.max = totalPoints; // Max value is now dynamic based on totalPoints
    input.classList.add('inputPoints');
    input.addEventListener('input', () => updatePoints(index, input));

    // +/- Buttons
    const decreaseBtn = document.createElement('button');
    decreaseBtn.textContent = '-';
    decreaseBtn.addEventListener('click', () => changePoints(index, -1));

    const increaseBtn = document.createElement('button');
    increaseBtn.textContent = '+';
    increaseBtn.addEventListener('click', () => changePoints(index, 1));

    controls.append(decreaseBtn, input, increaseBtn);
    row.append(attrName, controls);
    attributesContainer.append(row);
  });

  updateSummary();
}

// Change points using +/- buttons
function changePoints(index, delta) {
  const attribute = attributes[index];
  const input = document.querySelectorAll('.inputPoints')[index];

  // Check if the points change is valid
  const newPoints = attribute.points + delta;

  // Ensure the total points don't exceed the max limit (totalPoints)
  if (newPoints >= 0 && (usedPoints + delta) <= totalPoints) {
    attribute.points = newPoints;
    input.value = attribute.points;
    usedPoints += delta;
    updateSummary();
  }

}

// Update points when input field changes
function updatePoints(index, input) {
  const points = parseInt(input.value);
  const attribute = attributes[index];

  // Check if points are valid and within allowed range
  if (points >= 0 && (usedPoints - attribute.points + points) <= totalPoints) {
    usedPoints = usedPoints - attribute.points + points; // Adjust used points
    attribute.points = points;
    updateSummary();
  } else {
    input.value = attribute.points; // Reset to previous valid value
    alert("Total points cannot exceed " + totalPoints + " or be negative.");
  }
}

// Update summary of used and remaining points
function updateSummary() {
  const usedSpan = document.getElementById('usedAbility');
  const remainingSpan = document.getElementById('remainingAbility');
  usedSpan.textContent = usedPoints;
  remainingSpan.textContent = totalPoints - usedPoints;
}

// Navigate to the attribute page
function goTo(pageId) {
  const sections = document.querySelectorAll('section');
  sections.forEach(section => {
    section.classList.remove('active');
    section.classList.add('hidden');
  });
  document.getElementById(pageId).classList.remove('hidden');
  document.getElementById(pageId).classList.add('active');
}

// Validate name input and proceed to the next page
function validateName() {
  const nameInput = document.getElementById('charName').value.trim();
  
  if (nameInput === "") {
    alert("Please enter a name!");
    return;
  }
  
  // If valid, save the name and proceed to the next section
  localStorage.setItem('characterName', nameInput);
  goTo('raceSection'); // Go to the attribute assignment page
}

// Initialize the attribute page
document.addEventListener('DOMContentLoaded', () => {
  createAttributeInputs(); // Initialize attribute inputs
});

function toggleDescription(index) {
    const description = document.getElementById('description' + index);
    const details = document.getElementById('details' + index);
    const button = document.querySelector('#background' + index + ' button');
    
    // Toggle für die Sichtbarkeit der Beschreibung
    if (description.classList.contains('hiddenBackground')) {
    description.classList.remove('hiddenBackground');
    button.textContent = '− Hide Description';
    } else {
    description.classList.add('hiddenBackground');
    button.textContent = '+ Show Description';
    }

    // Toggle für die Sichtbarkeit der Details
    if (details.classList.contains('hiddenBackground')) {
    details.classList.remove('hiddenBackground');
    } else {
    details.classList.add('hiddenBackground');
    }
}

document.addEventListener('DOMContentLoaded', () => {
  const sliderRace = document.getElementById('sliderRace');
  const prevBtnRace = document.getElementById('prevBtnRace');
  const nextBtnRace = document.getElementById('nextBtnRace');

  const raceImages = [
    'images/Barbarian.png',
    'images/Bard.png',
    'images/Cleric.png',
    'images/Druid.png',
    'images/Fighter.png'
  ];

  function renderSliderRace() {
    sliderRace.innerHTML = '';

    for (let i = 0; i < raceImages.length; i++) {
      const img = document.createElement('img');
      img.src = raceImages[i];
      img.alt = `Bild ${i + 1}`;

      sliderRace.appendChild(img);
    }
  }

  function moveLeftRace() {
    const firstImage = raceImages.shift();
    raceImages.push(firstImage); 
    renderSlider();
  }

  function moveRightRace() {
    const lastImage = raceImages.pop();
    raceImages.unshift(lastImage); 
    renderSliderRace();
  }

  prevBtnRace.addEventListener('click', () => {
    document.getElementById('selectButton').style.backgroundColor = 'gray';
    moveLeftRace();
  });

  nextBtnRace.addEventListener('click', () => {
    document.getElementById('selectButton').style.backgroundColor = 'gray';
    moveRightRace();
  });

  renderSliderRace();
});


document.addEventListener('DOMContentLoaded', () => {
  const sliderClass = document.getElementById('sliderClass');
  const prevBtnClass = document.getElementById('prevBtnClass');
  const nextBtnClass = document.getElementById('nextBtnClass');

  const classImages = [
    'images/Monk.png',
    'images/Paladin.png',
    'images/Ranger.png',
    'images/Rogue.png',
    'images/Sorcerer.png'
  ];

  function renderSliderClass() {
    sliderClass.innerHTML = '';

    for (let i = 0; i < classImages.length; i++) {
      const img = document.createElement('img');
      img.src = classImages[i];
      img.alt = `Bild ${i + 1}`;

      sliderClass.appendChild(img);
    }
  }

  function moveLeftClass() {
    const firstImage = classImages.shift();
    classImages.push(firstImage); 
    renderSliderClass();
  }

  function moveRightClass() {
    const lastImage = classImages.pop();
    classImages.unshift(lastImage); 
    renderSliderClass();
  }

  prevBtnClass.addEventListener('click', () => {
    document.getElementById('selectButtonClass').style.backgroundColor = 'gray';
    moveLeftClass();
  });

  nextBtnClass.addEventListener('click', () => {
    document.getElementById('selectButtonClass').style.backgroundColor = 'gray';
    moveRightClass();
  });

  renderSliderClass();
});

function turnGreen() {
    document.getElementById('selectButton').style.backgroundColor = 'green';
}

function turnGreenClass() {
    document.getElementById('selectButtonClass').style.backgroundColor = 'green';
}