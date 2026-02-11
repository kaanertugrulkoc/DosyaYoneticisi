import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Platform,
    Alert,
    Dimensions,
    TextInput,
} from 'react-native';
import * as RNFS from 'react-native-fs';
import {
    ChevronRight,
    ArrowLeft,
    Search,
    MoreVertical,
    HardDrive,
    LayoutGrid,
    List as ListIcon,
    Plus
} from 'lucide-react-native';
import { theme } from '../theme/theme';
import { getFileIcon, formatSize } from '../utils/fileHelpers';

const { width } = Dimensions.get('window');

const ExplorerScreen = ({ navigation, route }) => {
    const currentPath = route.params?.path || RNFS.DocumentDirectoryPath;
    const folderName = currentPath.split('/').pop() || 'Dahili Depolama';

    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            const result = await RNFS.readDir(currentPath);
            // Sort: Folders first, then alphabetical
            const sorted = result.sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1;
                if (!a.isDirectory() && b.isDirectory()) return 1;
                return a.name.localeCompare(b.name);
            });
            setFiles(sorted);
            setFilteredFiles(sorted);
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Dosyalar okunurken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    }, [currentPath]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredFiles(files);
        } else {
            const filtered = files.filter(file =>
                file.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredFiles(filtered);
        }
    }, [searchQuery, files]);

    const onFilePress = (item) => {
        if (item.isDirectory()) {
            navigation.push('Explorer', { path: item.path });
        } else {
            // Potentially open file or show details
            Alert.alert('Bilgi', `${item.name} içeriği gösterilecek.`);
        }
    };

    const renderFileItem = ({ item }) => {
        const { Icon, color } = getFileIcon(item.name, item.isDirectory());

        if (viewMode === 'grid') {
            return (
                <TouchableOpacity
                    style={styles.gridItem}
                    onPress={() => onFilePress(item)}
                >
                    <View style={[styles.gridIconContainer, { backgroundColor: color + '15' }]}>
                        <Icon size={32} color={color} />
                    </View>
                    <Text numberOfLines={2} style={styles.gridText}>{item.name}</Text>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={styles.listItem}
                onPress={() => onFilePress(item)}
            >
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Icon size={24} color={color} />
                </View>
                <View style={styles.itemInfo}>
                    <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                        {item.isDirectory() ? 'Klasör' : formatSize(item.size)}
                    </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.headerLeft, isSearching && { flex: 1 }]}>
                    {(route.params?.path || isSearching) && (
                        <TouchableOpacity
                            onPress={() => {
                                if (isSearching) {
                                    setIsSearching(false);
                                    setSearchQuery('');
                                } else {
                                    navigation.goBack();
                                }
                            }}
                            style={styles.backButton}
                        >
                            <ArrowLeft color={theme.colors.text} size={24} />
                        </TouchableOpacity>
                    )}
                    {!isSearching ? (
                        <Text style={styles.headerTitle}>{folderName}</Text>
                    ) : (
                        <View style={styles.searchInputContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Dosya ara..."
                                autoFocus
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>
                    )}
                </View>
                <View style={styles.headerRight}>
                    {!isSearching && (
                        <TouchableOpacity
                            style={styles.headerIcon}
                            onPress={() => setIsSearching(true)}
                        >
                            <Search color={theme.colors.text} size={22} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.headerIcon}
                        onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                    >
                        {viewMode === 'list' ? <LayoutGrid color={theme.colors.text} size={22} /> : <ListIcon color={theme.colors.text} size={22} />}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Storage Summary (Only on root and not searching) */}
            {!route.params?.path && !isSearching && (
                <View style={styles.storageCard}>
                    <View style={styles.storageInfo}>
                        <View style={styles.storageIcon}>
                            <HardDrive color={theme.colors.primary} size={24} />
                        </View>
                        <View>
                            <Text style={styles.storageLabel}>Dahili Depolama</Text>
                            <Text style={styles.storageUsed}>%65 kullanıldı - 12 GB boş</Text>
                        </View>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '65%' }]} />
                    </View>
                </View>
            )}

            {/* File List */}
            <FlatList
                data={filteredFiles}
                renderItem={renderFileItem}
                keyExtractor={item => item.path}
                key={viewMode}
                numColumns={viewMode === 'grid' ? 3 : 1}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'Sonuç bulunamadı' : 'Bu klasör boş'}
                            </Text>
                        </View>
                    )
                }
            />

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Plus color="white" size={28} />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.background,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: theme.spacing.sm,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    headerRight: {
        flexDirection: 'row',
    },
    headerIcon: {
        padding: theme.spacing.sm,
    },
    storageCard: {
        backgroundColor: theme.colors.card,
        margin: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    storageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    storageIcon: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
    },
    storageLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    storageUsed: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    listContent: {
        paddingBottom: 100,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
    },
    itemMeta: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    gridItem: {
        width: width / 3,
        alignItems: 'center',
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    gridIconContainer: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    gridText: {
        fontSize: 13,
        textAlign: 'center',
        color: theme.colors.text,
        paddingHorizontal: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    searchInputContainer: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        fontSize: 16,
        color: theme.colors.text,
        padding: 0,
    },
});

export default ExplorerScreen;
