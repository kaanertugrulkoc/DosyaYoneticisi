import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { Heart, File, Folder, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { getFileIcon, formatSize } from '../utils/fileHelpers';

const FavoritesScreen = ({ navigation }) => {
    const { theme, isDarkMode } = useTheme();
    const { favorites, toggleFavorite } = useFavorites();

    const renderItem = ({ item }) => {
        // Determine if it's a gallery item or a file system item
        const isGalleryItem = !!item.uri && !item.path;
        const { Icon, color } = isGalleryItem
            ? { Icon: ImageIcon, color: theme.colors.image }
            : getFileIcon(item.name, item.isDirectory, theme);

        return (
            <TouchableOpacity
                style={[styles.itemCard, { backgroundColor: theme.colors.card }]}
                onPress={() => {
                    if (isGalleryItem) {
                        // Navigate to gallery view? For now just info
                    } else {
                        // Navigate to explorer
                    }
                }}
            >
                <View style={styles.itemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.background }]}>
                        <Icon size={24} color={color} />
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {item.name || item.filename || 'Adsız dosya'}
                        </Text>
                        <Text style={[styles.itemSubtitle, { color: theme.colors.textSecondary }]}>
                            {isGalleryItem ? 'Galeri Öğesi' : (item.isDirectory ? 'Klasör' : formatSize(item.size))}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => toggleFavorite(item)}>
                    <Heart size={24} color={theme.colors.error} fill={theme.colors.error} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Favoriler</Text>
            </View>

            <FlatList
                data={favorites}
                renderItem={renderItem}
                keyExtractor={(item, index) => (item.id || item.path || index).toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Heart size={80} color={theme.colors.border} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            Henüz favori eklenmedi
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
    },
    listContent: {
        padding: 15,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    titleContainer: {
        flex: 1,
        marginRight: 10,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    itemSubtitle: {
        fontSize: 13,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 20,
    }
});

export default FavoritesScreen;
