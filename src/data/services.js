/**
 * Szolgáltatások adatbázisa
 */
export const services = [
    {
        id: 'exterior-basic',
        name: 'Külső mosás',
        description: 'Alapos külső tisztítás + szárítás',
        duration: 30,
        price: 3500,
        icon: '💧'
    },
    {
        id: 'exterior-premium',
        name: 'Prémium külső',
        description: 'Mosás + viaszolás + gumik',
        duration: 60,
        price: 7500,
        icon: '✨'
    },
    {
        id: 'interior-basic',
        name: 'Belső tisztítás',
        description: 'Porszívózás + felületek',
        duration: 45,
        price: 5000,
        icon: '🧹'
    },
    {
        id: 'interior-deep',
        name: 'Mélytisztítás',
        description: 'Teljes belső + szőnyegek',
        duration: 90,
        price: 12000,
        icon: '🔬'
    },
    {
        id: 'full-package',
        name: 'Teljes csomag',
        description: 'Külső + Belső + Viasz',
        duration: 120,
        price: 18000,
        icon: '🌟'
    }
];
