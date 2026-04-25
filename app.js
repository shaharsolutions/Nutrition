import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA0a_ZOzAiILPpUhcmbOQOtC01bN4459Jo",
    authDomain: "myplate-588bb.firebaseapp.com",
    projectId: "myplate-588bb",
    storageBucket: "myplate-588bb.firebasestorage.app",
    messagingSenderId: "217219694595",
    appId: "1:217219694595:web:06cdee68ff4795d765ce36",
    measurementId: "G-7QFMPG0D2P"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const mealsCollection = collection(db, "meals");

// State Management
let meals = [];

// DOM Elements
const mealForm = document.getElementById('meal-form');
const mealList = document.getElementById('meal-list');
const repositoryList = document.getElementById('repository-list');
const stats = {
    morning: document.getElementById('stat-breakfast'),
    afternoon: document.getElementById('stat-lunch'),
    evening: document.getElementById('stat-dinner'),
    snacks: document.getElementById('stat-snacks')
};

const defaultImages = {
    repository: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1000',
    morning: 'https://images.unsplash.com/photo-1494859814609-3fbd927755d9?auto=format&fit=crop&q=80&w=1000',
    afternoon: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000',
    evening: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1000',
    snacks: 'https://images.unsplash.com/photo-1599490659223-e1539e7ad93c?auto=format&fit=crop&q=80&w=1000'
};

const timeLabels = {
    repository: 'מאגר',
    morning: 'בוקר',
    afternoon: 'צהריים',
    evening: 'ערב',
    snacks: 'נשנושים'
};

// Initialize
async function initApp() {
    initDragAndDrop();
    await fetchMeals();
}

async function fetchMeals() {
    try {
        const querySnapshot = await getDocs(mealsCollection);
        meals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort meals by createdAt descending so newest is first
        meals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        renderAll();
    } catch (error) {
        console.error("Error fetching meals:", error);
    }
}

initApp();

function renderAll() {
    renderMeals();
    renderRepository();
    updateStats();
}

// Form Submission
mealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = mealForm.querySelector('.btn-add');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>שומר...</span>';
    btn.disabled = true;

    const name = document.getElementById('meal-name').value;
    const time = document.getElementById('meal-time').value;
    const image = document.getElementById('meal-image').value || defaultImages[time];
    const saveToRepo = document.getElementById('save-to-repo').checked;

    const newMeal = {
        name,
        time,
        image,
        date: new Date().toLocaleDateString(),
        eaten: time !== 'repository',
        createdAt: Date.now()
    };

    try {
        const docRef = await addDoc(mealsCollection, newMeal);
        meals.unshift({ id: docRef.id, ...newMeal });

        if (time !== 'repository' && saveToRepo) {
            const repoItem = {
                ...newMeal,
                time: 'repository',
                eaten: false,
                createdAt: Date.now() + 1
            };
            const repoRef = await addDoc(mealsCollection, repoItem);
            meals.push({ id: repoRef.id, ...repoItem });
        }

        renderAll();
        mealForm.reset();
    } catch (error) {
        console.error("Error adding document:", error);
        alert('שגיאה בשמירת המנה');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Sync checkbox with select
const mealTimeSelect = document.getElementById('meal-time');
const saveToRepoContainer = document.getElementById('save-to-repo').parentElement;

function updateRepoCheckboxVisibility() {
    if (mealTimeSelect.value === 'repository') {
        saveToRepoContainer.style.display = 'none';
        document.getElementById('save-to-repo').checked = false;
    } else {
        saveToRepoContainer.style.display = 'flex';
    }
}

mealTimeSelect.addEventListener('change', updateRepoCheckboxVisibility);

// Set initial state
updateRepoCheckboxVisibility();

window.toggleEaten = async function(id) {
    const meal = meals.find(m => m.id === id);
    if (meal) {
        meal.eaten = !meal.eaten;
        renderAll(); // Optimistic update
        
        try {
            await updateDoc(doc(db, "meals", id), {
                eaten: meal.eaten
            });
        } catch (error) {
            console.error("Error updating document:", error);
            meal.eaten = !meal.eaten; // Revert
            renderAll();
        }
    }
};

window.deleteMeal = async function(id) {
    const previousMeals = [...meals];
    meals = meals.filter(m => m.id !== id);
    renderAll(); // Optimistic update

    try {
        await deleteDoc(doc(db, "meals", id));
    } catch (error) {
        console.error("Error deleting document:", error);
        meals = previousMeals; // Revert
        renderAll();
        alert('שגיאה במחיקת המנה');
    }
};

window.quickAddMeal = function(mealId) {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;

    const overlay = document.createElement('div');
    overlay.className = 'quick-add-overlay';
    
    overlay.innerHTML = `
        <div class="quick-add-modal animate-up">
            <h3>הוסף ליומן</h3>
            <p>לאיזו ארוחה להוסיף את "${meal.name}"?</p>
            <div class="quick-add-options">
                <button onclick="confirmQuickAdd('${mealId}', 'morning')">בוקר</button>
                <button onclick="confirmQuickAdd('${mealId}', 'afternoon')">צהריים</button>
                <button onclick="confirmQuickAdd('${mealId}', 'evening')">ערב</button>
                <button onclick="confirmQuickAdd('${mealId}', 'snacks')">נשנושים</button>
            </div>
            <button class="quick-add-close" onclick="this.closest('.quick-add-overlay').remove()">ביטול</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
};

window.confirmQuickAdd = async function(mealId, targetTime) {
    const overlay = document.querySelector('.quick-add-overlay');
    if (overlay) overlay.remove();

    const templateMeal = meals.find(m => m.id === mealId);
    if (!templateMeal) return;

    const newMeal = {
        name: templateMeal.name,
        image: templateMeal.image,
        time: targetTime,
        date: new Date().toLocaleDateString(),
        eaten: true,
        createdAt: Date.now()
    };

    try {
        const docRef = await addDoc(mealsCollection, newMeal);
        meals.unshift({ id: docRef.id, ...newMeal });
        renderAll();
    } catch (error) {
        console.error("Error adding document:", error);
        alert('שגיאה בהוספת המנה');
    }
};

function updateStats() {
    // Current day meals
    const today = new Date().toLocaleDateString();
    const todaysMeals = meals.filter(m => m.date === today && m.time !== 'repository');

    const counts = {
        morning: todaysMeals.filter(m => m.time === 'morning' && m.eaten).length,
        afternoon: todaysMeals.filter(m => m.time === 'afternoon' && m.eaten).length,
        evening: todaysMeals.filter(m => m.time === 'evening' && m.eaten).length,
        snacks: todaysMeals.filter(m => m.time === 'snacks' && m.eaten).length
    };

    // Update UI
    Object.keys(counts).forEach(key => {
        stats[key].textContent = `${counts[key]}`;
        
        if (counts[key] >= 1) {
            stats[key].classList.add('active');
        } else {
            stats[key].classList.remove('active');
        }
    });
}

function renderRepository() {
    repositoryList.innerHTML = '';
    const repoMeals = meals.filter(m => m.time === 'repository');

    if (repoMeals.length === 0) {
        repositoryList.innerHTML = `<div style="flex: 1 1 100%; text-align: center; padding: 2rem; color: var(--text-muted); font-size: 1rem;">
            המאגר ריק. הוסיפו מנות שתרצו לשמור להמשך!
        </div>`;
        return;
    }

    const hint = document.createElement('div');
    hint.style.flex = '1 1 100%';
    hint.style.textAlign = 'center';
    hint.style.fontSize = '0.9rem';
    hint.style.color = 'var(--text-muted)';
    hint.style.marginBottom = '1rem';
    hint.style.padding = '0 1rem';
    hint.innerHTML = '💡 <b>טיפ:</b> גררו מנה אל אחד העיגולים (בוקר/צהריים/ערב/נשנושים) למעלה כדי לסמן אותה כבוצעה.';
    repositoryList.appendChild(hint);

    repoMeals.forEach(meal => {
        const card = document.createElement('div');
        card.className = 'glass-card repo-card animate-up';
        card.draggable = true;
        card.dataset.id = meal.id;

        card.innerHTML = `
            <div class="card-actions">
                <button class="meal-delete" onclick="deleteMeal('${meal.id}')" title="מחק מהמאגר">×</button>
                <button class="meal-check active" style="font-size: 1.5rem; width: 36px; padding: 0; background: var(--accent-primary); border-color: var(--accent-primary);" onclick="quickAddMeal('${meal.id}')" title="הוסף ליומן">+</button>
            </div>
            <img src="${meal.image}" alt="${meal.name}" class="meal-image" onerror="this.src='https://via.placeholder.com/200x100?text=Image+Not+Found'">
            <div class="meal-content" style="padding: 0.5rem 0;">
                <h3 class="meal-name" dir="auto">${meal.name}</h3>
            </div>
        `;

        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', meal.id);
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        repositoryList.appendChild(card);
    });
}

function renderMeals() {
    mealList.innerHTML = '';
    const dailyMeals = meals.filter(m => m.time !== 'repository');

    if (dailyMeals.length === 0) {
        mealList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
            אין מנות רשומות עדיין. גררו מנה מהמאגר כדי להתחיל!
        </div>`;
        return;
    }

    const groupedMeals = dailyMeals.reduce((groups, meal) => {
        const date = meal.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(meal);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedMeals).sort((a, b) => {
        const parseDate = (d) => {
            const parts = d.split(/[./-]/);
            if (parts.length === 3) {
                if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]);
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            return new Date(d);
        };
        return parseDate(b) - parseDate(a);
    });

    sortedDates.forEach(date => {
        const dayGroup = document.createElement('section');
        dayGroup.className = 'day-group';
        
        const today = new Date().toLocaleDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString();

        let displayDate = date;
        if (date === today) displayDate = 'היום';
        else if (date === yesterdayStr) displayDate = 'אתמול';

        const mealsForDay = groupedMeals[date];
        dayGroup.innerHTML = `
            <h2 class="day-header">${displayDate} <span style="font-size: 0.9rem; font-weight: 400; color: var(--text-muted); margin-right: 10px;">(${mealsForDay.length} מנות)</span></h2>
            <div class="day-meals-grid"></div>
        `;

        const grid = dayGroup.querySelector('.day-meals-grid');

        mealsForDay.forEach((meal, index) => {
            const card = document.createElement('div');
            card.className = `glass-card meal-card animate-up ${meal.eaten ? 'eaten' : ''}`;
            card.style.animationDelay = `${index * 0.05}s`;

            card.innerHTML = `
                <div class="card-actions">
                    <button class="meal-check ${meal.eaten ? 'active' : ''}" onclick="toggleEaten('${meal.id}')" style="width: auto; padding: 0 10px; border-radius: 12px; font-size: 0.7rem;">
                        ${meal.eaten ? '✓ בוצע' : 'סמן כבוצע'}
                    </button>
                    <button class="meal-delete" onclick="deleteMeal('${meal.id}')">×</button>
                </div>
                <img src="${meal.image}" alt="${meal.name}" class="meal-image" onerror="this.src='https://via.placeholder.com/400x200?text=Image+Not+Found'">
                <div class="meal-content">
                    <span class="meal-tag tag-${meal.time}">${timeLabels[meal.time]}</span>
                    <h3 class="meal-name" dir="auto">${meal.name}</h3>
                </div>
            `;
            grid.appendChild(card);
        });

        mealList.appendChild(dayGroup);
    });
}

function initDragAndDrop() {
    const dropTargets = [
        { el: document.getElementById('stat-breakfast').parentElement, time: 'morning' },
        { el: document.getElementById('stat-lunch').parentElement, time: 'afternoon' },
        { el: document.getElementById('stat-dinner').parentElement, time: 'evening' },
        { el: document.getElementById('stat-snacks').parentElement, time: 'snacks' }
    ];

    dropTargets.forEach(target => {
        target.el.classList.add('drop-zone');

        target.el.addEventListener('dragover', (e) => {
            e.preventDefault();
            target.el.classList.add('drag-over');
        });

        target.el.addEventListener('dragleave', () => {
            target.el.classList.remove('drag-over');
        });

        target.el.addEventListener('drop', async (e) => {
            e.preventDefault();
            target.el.classList.remove('drag-over');
            
            const mealId = e.dataTransfer.getData('text/plain');
            const meal = meals.find(m => m.id === mealId);
            
            if (meal) {
                if (meal.time === 'repository') {
                    // Create a copy of the meal for the daily log
                    const newMeal = {
                        name: meal.name,
                        image: meal.image,
                        time: target.time,
                        date: new Date().toLocaleDateString(),
                        eaten: true,
                        createdAt: Date.now()
                    };

                    try {
                        const docRef = await addDoc(mealsCollection, newMeal);
                        meals.unshift({ id: docRef.id, ...newMeal });
                        renderAll();
                    } catch (error) {
                        console.error("Error adding document:", error);
                        alert('שגיאה בשמירת המנה');
                    }
                } else {
                    // Moving an existing daily meal
                    const prevTime = meal.time;
                    const prevDate = meal.date;
                    const prevEaten = meal.eaten;

                    meal.time = target.time;
                    meal.date = new Date().toLocaleDateString();
                    meal.eaten = true;
                    renderAll(); // Optimistic update

                    try {
                        await updateDoc(doc(db, "meals", mealId), {
                            time: meal.time,
                            date: meal.date,
                            eaten: meal.eaten
                        });
                    } catch (error) {
                        console.error("Error updating document:", error);
                        meal.time = prevTime;
                        meal.date = prevDate;
                        meal.eaten = prevEaten;
                        renderAll(); // Revert
                    }
                }
            }
        });
    });
}
