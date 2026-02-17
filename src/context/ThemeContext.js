import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const themes = {
    light: {
        dark: false,
        colors: {
            primary: '#6366f1',
            background: '#f8fafc',
            card: '#ffffff',
            text: '#1e293b',
            textSecondary: '#64748b',
            border: '#e2e8f0',
            notification: '#ef4444',
            folder: '#6366f1',
            image: '#ec4899',
            video: '#8b5cf6',
            audio: '#10b981',
            document: '#f59e0b',
            trash: '#ef4444',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            white: '#ffffff',
        },
    },
    dark: {
        dark: true,
        colors: {
            primary: '#818cf8',
            background: '#0f172a',
            card: '#1e293b',
            text: '#f1f5f9',
            textSecondary: '#94a3b8',
            border: '#334155',
            notification: '#f87171',
            folder: '#818cf8',
            image: '#f472b6',
            video: '#a78bfa',
            audio: '#34d399',
            document: '#fbbf24',
            trash: '#f87171',
            success: '#4ade80',
            warning: '#fbbf24',
            error: '#f87171',
            white: '#ffffff',
        },
    },
};

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('user-theme');
            if (savedTheme !== null) {
                setIsDarkMode(savedTheme === 'dark');
            } else {
                setIsDarkMode(systemColorScheme === 'dark');
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    };

    const toggleTheme = async () => {
        try {
            const newMode = !isDarkMode;
            setIsDarkMode(newMode);
            await AsyncStorage.setItem('user-theme', newMode ? 'dark' : 'light');
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    const theme = isDarkMode ? themes.dark : themes.light;

    return (
        <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
