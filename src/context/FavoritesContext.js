import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const saved = await AsyncStorage.getItem('user-favorites');
            if (saved) {
                setFavorites(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    };

    const toggleFavorite = async (item) => {
        try {
            const isExist = favorites.find(f => f.path === item.path || f.id === item.id);
            let newFavorites;
            if (isExist) {
                newFavorites = favorites.filter(f => (f.path !== item.path && f.path !== undefined) || (f.id !== item.id && f.id !== undefined));
            } else {
                newFavorites = [...favorites, item];
            }
            setFavorites(newFavorites);
            await AsyncStorage.setItem('user-favorites', JSON.stringify(newFavorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    };

    const isFavorite = (item) => {
        return favorites.some(f => (f.path === item.path && item.path !== undefined) || (f.id === item.id && item.id !== undefined));
    };

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};
