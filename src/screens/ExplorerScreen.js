import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Alert,
    Dimensions,
    TextInput,
    Modal,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
    ChevronRight,
    ArrowLeft,
    Search,
    MoreVertical,
    HardDrive,
    LayoutGrid,
    List as ListIcon,
    Plus,
    Image as ImageIcon,
    Video,
    Music,
    Download,
    Trash2,
    PieChart,
    Package, // Changed from AppWindow
    File,
    Folder,
    X,
    Check,
    Edit2,
    Info,
    RefreshCw
} from 'lucide-react-native';
import { theme } from '../theme/theme';
import { getFileIcon, formatSize } from '../utils/fileHelpers';

const { width } = Dimensions.get('window');

const ExplorerScreen = ({ navigation, route }) => {
    const defaultPath = FileSystem.documentDirectory;
    // Route params: path (string), category (string: 'image'|'video'|'audio'|'app'|'download'), title (string)
    const currentPath = route.params?.path || defaultPath;
    const isRoot = !route.params?.path && !route.params?.category;
    const category = route.params?.category;
    const title = route.params?.title || (isRoot ? 'Dosya Yöneticisi' : (category ? getCategoryTitle(category) : currentPath.split('/').pop()));

    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Dashboard Stats
    const [stats, setStats] = useState({
        image: 0,
        video: 0,
        audio: 0,
        app: 0,
        download: 0,
        trash: 0,
        free: 0,
        total: 100 // dummy total
    });

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [renameText, setRenameText] = useState('');
    const [actionType, setActionType] = useState('menu'); // 'menu' | 'rename'

    function getCategoryTitle(cat) {
        switch (cat) {
            case 'image': return 'Fotoğraflar';
            case 'video': return 'Videolar';
            case 'audio': return 'Ses Dosyaları';
            case 'app': return 'Uygulamalar';
            case 'download': return 'İndirilenler';
            case 'trash': return 'Geri Dönüşüm';
            default: return 'Dosyalar';
        }
    }

    // Initialize required folders
    useEffect(() => {
        const initFolders = async () => {
            if (!defaultPath) return;
            const trashPath = defaultPath + '.trash/';
            const downloadPath = defaultPath + 'Download/';

            try {
                const trashInfo = await FileSystem.getInfoAsync(trashPath);
                if (!trashInfo.exists) await FileSystem.makeDirectoryAsync(trashPath);

                const downloadInfo = await FileSystem.getInfoAsync(downloadPath);
                if (!downloadInfo.exists) await FileSystem.makeDirectoryAsync(downloadPath);
            } catch (e) {
                console.log('Init error', e);
            }
        };
        initFolders();
    }, []);

    // Helper: Recursive Scan for Categories
    const scanRecursively = async (dir, type) => {
        let results = [];
        try {
            const entries = await FileSystem.readDirectoryAsync(dir);
            for (const entry of entries) {
                if (entry.startsWith('.') && entry !== '.trash') continue;
                if (entry === '.trash' && type !== 'trash') continue; // Only scan trash if type is trash

                const fullPath = dir + (dir.endsWith('/') ? '' : '/') + entry;
                const info = await FileSystem.getInfoAsync(fullPath);

                if (info.isDirectory) {
                    // Deep scan is risky for large FS, limit depth or rely on flat search?
                    // For this demo, let's limit to one level deep for performance or just root + Downloads
                    // A true file manager needs better index. 
                    // Let's recursively scan but be careful.
                    const subResults = await scanRecursively(fullPath, type);
                    results = [...results, ...subResults];
                } else {
                    if (matchType(entry, type)) {
                        results.push({
                            name: entry,
                            path: fullPath,
                            isDirectory: () => false,
                            size: info.size
                        });
                    }
                }
            }
        } catch (e) {
            console.log('Scan error:', e);
        }
        return results;
    };

    const matchType = (filename, type) => {
        const ext = filename.split('.').pop().toLowerCase();
        if (type === 'image') return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext);
        if (type === 'video') return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
        if (type === 'audio') return ['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext);
        if (type === 'app') return ['apk', 'ipa'].includes(ext);
        return false;
    };

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            let items = [];

            if (category) {
                if (category === 'trash') {
                    const trashPath = defaultPath + '.trash/';
                    const names = await FileSystem.readDirectoryAsync(trashPath);
                    items = await Promise.all(names.map(async name => {
                        const path = trashPath + name;
                        const info = await FileSystem.getInfoAsync(path);
                        return { name, path, isDirectory: () => info.isDirectory, size: info.size };
                    }));
                } else if (category === 'download') {
                    const path = defaultPath + 'Download/';
                    // Ensure it exists
                    const info = await FileSystem.getInfoAsync(path);
                    if (!info.exists) await FileSystem.makeDirectoryAsync(path);

                    const names = await FileSystem.readDirectoryAsync(path);
                    items = await Promise.all(names.map(async name => {
                        const p = path + name;
                        const info = await FileSystem.getInfoAsync(p);
                        return { name, path: p, isDirectory: () => info.isDirectory, size: info.size };
                    }));
                } else {
                    // Start scan from root
                    items = await scanRecursively(defaultPath, category);
                }
            } else {
                // Normal Folder Mode
                const names = await FileSystem.readDirectoryAsync(currentPath);
                items = await Promise.all(names.map(async (name) => {
                    const itemPath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`;
                    const info = await FileSystem.getInfoAsync(itemPath);
                    return {
                        name,
                        path: itemPath,
                        isDirectory: () => info.isDirectory,
                        size: info.size || 0,
                    };
                })).then(res => res.filter(i => !i.name.startsWith('.') || category === 'trash'));
            }

            // Sort logic
            const sorted = items.sort((a, b) => {
                const aIsDir = a.isDirectory();
                const bIsDir = b.isDirectory();
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.name.localeCompare(b.name);
            });

            setFiles(sorted);
            setFilteredFiles(sorted);

        } catch (error) {
            console.error(error);
            // Alert.alert('Hata', 'Dosyalar okunurken sorun oluştu.'); 
        } finally {
            setLoading(false);
        }
    }, [currentPath, category]);

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

    // --- File Operations ---

    const openMenu = (item) => {
        setSelectedFile(item);
        setActionType('menu');
        setModalVisible(true);
    };

    const handleRename = async () => {
        if (!renameText.trim()) return;
        // Construct new path
        // Be careful with slashes
        const parentPath = selectedFile.path.substring(0, selectedFile.path.lastIndexOf('/'));
        const newPath = parentPath + '/' + renameText;

        try {
            await FileSystem.moveAsync({ from: selectedFile.path, to: newPath });
            setModalVisible(false);
            setRenameText('');
            loadFiles();
            Alert.alert('Başarılı', 'Dosya yeniden adlandırıldı.');
        } catch (e) {
            Alert.alert('Hata', 'Yeniden adlandırma başarısız. ' + e.message);
        }
    };

    const handleDelete = async () => {
        try {
            if (category === 'trash') {
                // Permanent Delete
                await FileSystem.deleteAsync(selectedFile.path);
                Alert.alert('Silindi', 'Dosya kalıcı olarak silindi.');
            } else {
                // Move to Trash
                const trashPath = defaultPath + '.trash/' + selectedFile.name;
                await FileSystem.moveAsync({ from: selectedFile.path, to: trashPath });
                Alert.alert('Taşındı', 'Dosya geri dönüşüm kutusuna taşındı.');
            }
            setModalVisible(false);
            loadFiles();
        } catch (e) {
            console.log(e);
            Alert.alert('Hata', 'Silme işlemi başarısız.');
        }
    };

    const confirmDelete = () => {
        Alert.alert(
            category === 'trash' ? 'Kalıcı Olarak Sil' : 'Geri Dönüşüme Taşı',
            `"${selectedFile?.name}" ögesini silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: handleDelete }
            ]
        );
    };

    const onFilePress = (item) => {
        if (item.isDirectory()) {
            navigation.push('Explorer', { path: item.path });
        } else {
            openMenu(item);
        }
    };

    const navigateToCategory = (cat) => {
        navigation.push('Explorer', { category: cat });
    };

    // --- Components ---

    const Dashboard = () => (
        <ScrollView style={styles.dashboardContainer} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Storage Card */}
            <View style={styles.storageCard}>
                <View style={styles.storageHeader}>
                    <View style={styles.storageIconBg}>
                        <HardDrive size={24} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.storageTitle}>Dahili Depolama</Text>
                        <Text style={styles.storageSubtitle}>Boş alanı kontrol et</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.percentText}>65%</Text>
                    </View>
                </View>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '65%' }]} />
                </View>
                <TouchableOpacity style={styles.analyzeButton} onPress={() => Alert.alert('Analiz', 'Bellek analizi detayı burada olacak.')}>
                    <Text style={styles.analyzeText}>Bellek Analizi</Text>
                    <ChevronRight size={16} color="white" />
                </TouchableOpacity>
            </View>

            {/* Categories Grid */}
            <Text style={styles.sectionTitle}>Kategoriler</Text>
            <View style={styles.gridContainer}>
                <CategoryCard
                    title="İndirilenler"
                    icon={Download}
                    color="#3b82f6"
                    onPress={() => navigateToCategory('download')}
                />
                <CategoryCard
                    title="Fotoğraflar"
                    icon={ImageIcon}
                    color="#ec4899"
                    onPress={() => navigateToCategory('image')}
                />
                <CategoryCard
                    title="Videolar"
                    icon={Video}
                    color="#8b5cf6"
                    onPress={() => navigateToCategory('video')}
                />
                <CategoryCard
                    title="Ses"
                    icon={Music}
                    color="#10b981"
                    onPress={() => navigateToCategory('audio')}
                />
                <CategoryCard
                    title="Uygulamalar"
                    icon={Package}
                    color="#f59e0b"
                    onPress={() => navigateToCategory('app')}
                />
                <CategoryCard
                    title="Geri Dönüşüm"
                    icon={Trash2}
                    color="#ef4444"
                    onPress={() => navigateToCategory('trash')}
                />
            </View>

            <View style={styles.recentHeader}>
                <Text style={styles.sectionTitle}>Dosyalar</Text>
                <TouchableOpacity onPress={() => navigation.push('Explorer', { path: defaultPath, title: 'Tüm Dosyalar' })}>
                    <Text style={styles.seeAll}>Tümünü Gör</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const CategoryCard = ({ title, icon: Icon, color, onPress }) => (
        <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
            <View style={[styles.categoryIcon, { backgroundColor: color + '20' }]}>
                <Icon size={28} color={color} />
            </View>
            <Text style={styles.categoryTitle}>{title}</Text>
        </TouchableOpacity>
    );

    const renderFileItem = ({ item }) => {
        const { Icon, color } = getFileIcon(item.name, item.isDirectory());

        if (viewMode === 'grid') {
            return (
                <TouchableOpacity
                    style={styles.gridItem}
                    onPress={() => onFilePress(item)}
                    onLongPress={() => openMenu(item)}
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
                onLongPress={() => openMenu(item)}
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
                <TouchableOpacity onPress={() => openMenu(item)} style={{ padding: 8 }}>
                    <MoreVertical size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.headerLeft, isSearching && { flex: 1 }]}>
                    {(!isRoot || isSearching) && (
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
                        <Text style={styles.headerTitle}>{title}</Text>
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
                {!isSearching && (
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerIcon} onPress={() => setIsSearching(true)}>
                            <Search color={theme.colors.text} size={22} />
                        </TouchableOpacity>
                        {(!isRoot || category) && (
                            <TouchableOpacity
                                style={styles.headerIcon}
                                onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                            >
                                {viewMode === 'list' ? <LayoutGrid size={22} color={theme.colors.text} /> : <ListIcon size={22} color={theme.colors.text} />}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Content */}
            {isRoot && !isSearching ? (
                <Dashboard />
            ) : (
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
                                {loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : (
                                    <Text style={styles.emptyText}>
                                        {searchQuery ? 'Sonuç bulunamadı' : 'Dosya yok'}
                                    </Text>
                                )}
                            </View>
                        )
                    }
                />
            )}

            {/* General Actions FAB (Root only) */}
            {isRoot && (
                <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Yeni', 'Klasör veya Dosya oluştur')}>
                    <Plus color="white" size={28} />
                </TouchableOpacity>
            )}

            {/* Operations Modal */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {actionType === 'menu' ? (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.iconContainer, { width: 40, height: 40, marginRight: 12 }]}>
                                            <File size={24} color={theme.colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalTitle} numberOfLines={1}>
                                                {selectedFile?.name}
                                            </Text>
                                            <Text style={styles.modalSubtitle}>
                                                {selectedFile?.isDirectory() ? 'Klasör' : formatSize(selectedFile?.size)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.actionRow} onPress={() => { setActionType('rename'); setRenameText(selectedFile.name); }}>
                                        <View style={[styles.actionIcon, { backgroundColor: '#f1f5f9' }]}>
                                            <Edit2 size={20} color={theme.colors.text} />
                                        </View>
                                        <Text style={styles.actionText}>Yeniden Adlandır</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionRow} onPress={confirmDelete}>
                                        <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                                            <Trash2 size={20} color={theme.colors.error} />
                                        </View>
                                        <Text style={[styles.actionText, { color: theme.colors.error }]}>
                                            {category === 'trash' ? 'Kalıcı Olarak Sil' : 'Sil'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionRow} onPress={() => { setModalVisible(false); Alert.alert('Bilgi', `Yol: ${selectedFile.path}`); }}>
                                        <View style={[styles.actionIcon, { backgroundColor: '#f1f5f9' }]}>
                                            <Info size={20} color={theme.colors.text} />
                                        </View>
                                        <Text style={styles.actionText}>Bilgi</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            // Rename View
                            <View style={styles.renameContainer}>
                                <Text style={styles.renameTitle}>Yeniden Adlandır</Text>
                                <TextInput
                                    style={styles.renameInput}
                                    value={renameText}
                                    onChangeText={setRenameText}
                                    autoFocus
                                    selectTextOnFocus
                                />
                                <View style={styles.renameButtons}>
                                    <TouchableOpacity
                                        style={[styles.renameButton, styles.cancelButton]}
                                        onPress={() => setActionType('menu')}
                                    >
                                        <Text style={styles.cancelButtonText}>İptal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.renameButton, styles.saveButton]}
                                        onPress={handleRename}
                                    >
                                        <Text style={styles.saveButtonText}>Kaydet</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8fafc',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    headerRight: {
        flexDirection: 'row',
    },
    headerIcon: {
        padding: 8,
        marginLeft: 4,
    },
    dashboardContainer: {
        flex: 1,
        padding: 16,
    },
    storageCard: {
        backgroundColor: '#6366f1',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        elevation: 5,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    storageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    storageIconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    storageTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    storageSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    percentText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 4,
    },
    analyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 12,
    },
    analyzeText: {
        color: 'white',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    categoryCard: {
        width: (width - 48) / 2, // 2 column
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    categoryIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    seeAll: {
        color: '#6366f1',
        fontWeight: '600',
    },
    // List Styles
    listContent: {
        paddingBottom: 100,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        backgroundColor: '#f1f5f9',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1e293b',
        marginBottom: 4,
    },
    itemMeta: {
        fontSize: 13,
        color: '#64748b',
    },
    gridItem: {
        width: width / 3,
        alignItems: 'center',
        padding: 8,
        marginBottom: 16,
    },
    gridIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    gridText: {
        fontSize: 13,
        textAlign: 'center',
        color: '#1e293b',
        paddingHorizontal: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
    },
    searchInputContainer: {
        flex: 1,
        marginRight: 8,
    },
    searchInput: {
        fontSize: 16,
        color: '#1e293b',
        padding: 0,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 250,
        paddingBottom: 40,
    },
    modalHeader: {
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748b',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
        marginLeft: 16,
    },
    // Rename
    renameContainer: {
        paddingBottom: 20,
    },
    renameTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        color: '#1e293b',
    },
    renameInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        color: '#1e293b',
    },
    renameButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    renameButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 12,
    },
    cancelButton: {
        backgroundColor: '#f1f5f9',
    },
    saveButton: {
        backgroundColor: '#6366f1',
    },
    cancelButtonText: {
        color: '#64748b',
        fontWeight: '600',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});

export default ExplorerScreen;
