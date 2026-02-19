import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Files, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../context/ThemeContext';
import { formatSize } from '../utils/fileHelpers';

const DuplicateFinderScreen = ({ navigation }) => {
    const { theme, isDarkMode } = useTheme();
    const [loading, setLoading] = useState(false);
    const [duplicates, setDuplicates] = useState([]);

    const scanForDuplicates = async () => {
        setLoading(true);
        try {
            const docDir = FileSystem.documentDirectory;
            const files = await FileSystem.readDirectoryAsync(docDir);

            const fileMap = {};
            const foundDuplicates = [];

            for (const name of files) {
                const path = docDir + name;
                const info = await FileSystem.getInfoAsync(path);
                if (!info.isDirectory) {
                    const key = `${info.size}_${name.split('.').pop()}`; // Simple key: size + extension
                    if (fileMap[key]) {
                        foundDuplicates.push({ ...info, name, original: fileMap[key].name });
                    } else {
                        fileMap[key] = { ...info, name };
                    }
                }
            }
            setDuplicates(foundDuplicates);
            if (foundDuplicates.length === 0) {
                Alert.alert('Bilgi', 'Hiç kopya dosya bulunamadı.');
            }
        } catch (e) {
            Alert.alert('Hata', 'Tarama başarısız oldu.');
        } finally {
            setLoading(false);
        }
    };

    const deleteDuplicate = async (path) => {
        try {
            await FileSystem.deleteAsync(path);
            setDuplicates(prev => prev.filter(d => d.uri !== path));
            Alert.alert('Başarılı', 'Kopya dosya silindi.');
        } catch (e) {
            Alert.alert('Hata', 'Dosya silinemedi.');
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.duplicateCard, { backgroundColor: theme?.colors?.card || '#ffffff' }]}>
            <View style={styles.cardHeader}>
                <Files size={20} color={theme?.colors?.primary || '#6366f1'} />
                <Text style={[styles.fileName, { color: theme?.colors?.text || '#1e293b' }]} numberOfLines={1}>{item.name}</Text>
            </View>
            <Text style={[styles.fileInfo, { color: theme?.colors?.textSecondary || '#64748b' }]}>
                Boyut: {formatSize(item.size)} | Orijinal: {item.original}
            </Text>
            <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: (theme?.colors?.error || '#ef4444') + '20' }]}
                onPress={() => deleteDuplicate(item.uri)}
            >
                <Trash2 size={18} color={theme?.colors?.error || '#ef4444'} />
                <Text style={[styles.deleteText, { color: theme?.colors?.error || '#ef4444' }]}>Kopyayı Sil</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme?.colors?.background || '#f8fafc' }]} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme?.colors?.text || '#1e293b'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme?.colors?.text || '#1e293b' }]}>Kopya Dosya Bulucu</Text>
            </View>

            <View style={styles.introBox}>
                <Text style={[styles.introText, { color: theme?.colors?.textSecondary || '#64748b' }]}>
                    Cihazınızdaki aynı boyuta ve türe sahip olan kopya dosyaları tarayarak yer açın.
                </Text>
                <TouchableOpacity
                    style={[styles.scanBtn, { backgroundColor: theme?.colors?.primary || '#6366f1' }]}
                    onPress={scanForDuplicates}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.scanBtnText}>Taramayı Başlat</Text>}
                </TouchableOpacity>
            </View>

            <FlatList
                data={duplicates}
                renderItem={renderItem}
                keyExtractor={item => item.uri}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    !loading && duplicates.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <CheckCircle2 size={64} color={theme?.colors?.success || '#22c55e'} opacity={0.5} />
                            <Text style={[styles.emptyText, { color: theme?.colors?.textSecondary || '#64748b' }]}>Tarama yapın veya tertemiz cihazın tadını çıkarın!</Text>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    introBox: { padding: 20, alignItems: 'center' },
    introText: { textAlign: 'center', marginBottom: 20, fontSize: 14, lineHeight: 20 },
    scanBtn: { width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' },
    scanBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    list: { padding: 20 },
    duplicateCard: { padding: 15, borderRadius: 16, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    fileName: { flex: 1, marginLeft: 10, fontWeight: '600', fontSize: 15 },
    fileInfo: { fontSize: 12, marginBottom: 15 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10 },
    deleteText: { marginLeft: 8, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 20, fontSize: 14, textAlign: 'center' }
});

export default DuplicateFinderScreen;
