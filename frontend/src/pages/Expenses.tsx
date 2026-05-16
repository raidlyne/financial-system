import React, { useContext, useEffect, useRef, useState } from 'react';
import type { GetRef, InputRef, TableProps } from 'antd';
import {
    Button,
    Form,
    Input,
    Popconfirm,
    Table,
    Calendar,
    Card,
    Flex,
    Typography,
    Tag,
    message,
    Spin,
    Empty,
    Select
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { expensesApi, type Expense, type UpdateExpenseDto } from '../api/expenses';
import { dictionariesApi, type Category } from '../api/dictionaries'; // Импорт словарей
import type { CalendarProps } from 'antd';

const { Text } = Typography;

// --- Типы для таблицы ---
type FormInstance<T> = GetRef<typeof Form<T>>;

const EditableContext = React.createContext<FormInstance<any> | null>(null);

interface EditableRowProps {
    index: number;
}

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
    const [form] = Form.useForm();
    return (
        <Form form={form} component={false}>
            <EditableContext.Provider value={form}>
                <tr {...props} />
            </EditableContext.Provider>
        </Form>
    );
};

// Интерфейс пропсов ячейки расширен для поддержки Select
interface EditableCellProps {
    title: React.ReactNode;
    editable: boolean;
    dataIndex: keyof Expense;
    record: Expense;
    handleSave: (record: Expense) => void;
    inputType?: 'number' | 'text';
    selectOptions?: any[]; // Для категорий и тегов
    isMultiSelect?: boolean; // Флаг для тегов
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
                                                                                title,
                                                                                editable,
                                                                                children,
                                                                                dataIndex,
                                                                                record,
                                                                                handleSave,
                                                                                inputType,
                                                                                selectOptions,
                                                                                isMultiSelect,
                                                                                ...restProps
                                                                            }) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<InputRef>(null);
    const form = useContext(EditableContext)!;

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
        }
    }, [editing]);

    const toggleEdit = () => {
        setEditing(!editing);

        // Подготовка данных для формы
        let initialValue = record[dataIndex];

        // Для тегов нам нужен массив ID, а не имен.
        // Но в record.tags у нас имена. Это проблема маппинга.
        // Решение: Мы будем хранить в локальном стейте таблицы и ID тоже, если возможно.
        // Или проще: При редактировании тегов мы просто шлем новые ID, а UI обновится после перезагрузки строки.
        // Чтобы Select работал корректно, нам нужно передать в него текущие ID тегов.
        // Допустим, мы добавили поле tagIds в интерфейс Expense для удобства.

        if (dataIndex === 'tagIds') {
            // Если мы редактируем теги, берем их из поля tagIds (которое мы должны добавить в модель)
            // Или парсим из tags, если у нас есть маппинг имя->ID.
            // Лучше всего: Добавить tagIds в интерфейс Expense и маппить их при загрузке.
            initialValue = record['tagIds' as keyof Expense] || [];
        }

        form.setFieldsValue({ [dataIndex]: initialValue });
    };

    const save = async () => {
        try {
            const values = await form.validateFields();

            let processedValues = { ...values };

            // Обработка числового поля
            if (inputType === 'number' && values[dataIndex] !== undefined) {
                const numValue = Number(values[dataIndex]);
                if (isNaN(numValue) || numValue <= 0) {
                    throw new Error('Сумма должна быть положительным числом');
                }
                processedValues = { [dataIndex]: numValue };
            }

            toggleEdit();
            handleSave({ ...record, ...processedValues });
        } catch (errInfo) {
            console.log('Save failed:', errInfo);
            message.error('Ошибка валидации');
        }
    };

    let childNode = children;

    if (editable) {
        childNode = editing ? (
            <Form.Item
                style={{ margin: 0 }}
                name={dataIndex}
                rules={[{ required: true, message: `${title} обязательно.` }]}
            >
                {/* Рендеринг разных типов инпутов */}
                {selectOptions ? (
                    <Select
                        ref={inputRef as any} // Cast to any because Select doesn't have same ref type as Input
                        onBlur={save}
                        mode={isMultiSelect ? "tags" : undefined} // Tags mode allows creating new or selecting existing
                        placeholder="Выберите..."
                        options={selectOptions}
                        // Для multi-select важно, чтобы значения были массивом
                        {...(isMultiSelect ? { tokenSeparators: [',']} : {})}
                    />
                ) : inputType === 'number' ? (
                    <Input
                        ref={inputRef}
                        onPressEnter={save}
                        onBlur={save}
                        type="number"
                        min={0.01}
                        step="0.01"
                    />
                ) : (
                    <Input
                        ref={inputRef}
                        onPressEnter={save}
                        onBlur={save}
                    />
                )}
            </Form.Item>
        ) : (
            <div
                className="editable-cell-value-wrap"
                style={{ paddingInlineEnd: 24, cursor: 'pointer' }}
                onClick={toggleEdit}
            >
                {children}
            </div>
        );
    }

    return <td {...restProps}>{childNode}</td>;
};

// --- Основная страница ---

const Expenses: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [dataSource, setDataSource] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);

    // Состояние для справочников
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);

    // Загрузка справочников при монтировании
    useEffect(() => {
        const loadDictionaries = async () => {
            try {
                const [catsRes, tagsRes] = await Promise.all([
                    dictionariesApi.getCategories(),
                    dictionariesApi.getTags()
                ]);
                setCategories(catsRes.data);
                setTags(tagsRes.data);
            } catch (e) {
                message.error('Ошибка загрузки справочников');
            }
        };
        loadDictionaries();
    }, []);

    // Загрузка данных при изменении даты
    useEffect(() => {
        loadExpenses(selectedDate);
    }, [selectedDate]);

    const loadExpenses = async (date: Dayjs) => {
        setLoading(true);
        try {
            const dateString = date.format('YYYY-MM-DD');
            const response = await expensesApi.getByDate(dateString);

            // Маппинг: добавляем key и преобразуем теги в ID для удобства редактирования
            // Примечание: В идеале бэкенд должен возвращать и tagIds.
            // Если бэкенд возвращает только имена тегов, нам придется искать ID по имени, что ненадежно.
            // Предположим, что мы добавили поле tagIds в интерфейс Expense на фронтенде для внутренней кухни,
            // но пока будем использовать имена.

            // ХАК: Для редактирования тегов через Select нам нужны ID.
            // Если API отдает только имена, мы не сможем легко сделать edit-in-place для тегов без дополнительного запроса или изменения API.
            // РЕШЕНИЕ: Изменим интерфейс Expense локально, чтобы он содержал tagIds, если API это поддерживает.
            // Если API НЕ поддерживает возврат tagIds, то редактирование тегов в таблице будет сложным.
            // Давай предположим, что ты можешь немного доработать DTO на бэкенде, чтобы возвращать tagIds.
            // Если нет, то в этом примере я буду использовать заглушку: map names to IDs if possible.

            const mappedData = response.data.map(item => {
                // Пытаемся найти ID тегов по именам (если бэкенд не отдает ID)
                // Это не идеально, но работает для демонстрации
                const tagIds = item.tags.map(tagName => {
                    const foundTag = tags.find(t => t.name === tagName);
                    return foundTag ? foundTag.id : null;
                }).filter(id => id !== null) as number[];

                return {
                    ...item,
                    key: item.id.toString(),
                    tagIds: tagIds // Сохраняем ID для селекта
                };
            });

            setDataSource(mappedData);
        } catch (error) {
            message.error('Ошибка при загрузке трат');
            setDataSource([]);
        } finally {
            setLoading(false);
        }
    };

    const onSelect: CalendarProps<Dayjs>['onSelect'] = (value) => {
        setSelectedDate(value);
    };

    const disabledDate: CalendarProps<Dayjs>['disabledDate'] = (current) => {
        return current && current > dayjs().endOf('day');
    };

    // Обработчик сохранения
    const handleSave = async (row: any) => { // any, так как мы добавили tagIds
        const newData = [...dataSource];
        const index = newData.findIndex((item) => row.key === item.key);
        const oldItem = newData[index];

        const changes: UpdateExpenseDto = {};

        if (oldItem.amount !== row.amount) changes.amount = row.amount;
        if (oldItem.description !== row.description) changes.description = row.description;

        // Обработка категории
        if (oldItem.categoryId !== row.categoryId) {
            changes.categoryId = row.categoryId;
            // Также обновим имя категории в UI сразу
            const newCat = categories.find(c => c.id === row.categoryId);
            if (newCat) row.categoryName = newCat.name;
        }

        // Обработка тегов
        // Сравниваем массивы ID
        const oldTagIds = oldItem.tagIds || [];
        const newTagIds = row.tagIds || [];

        // Простая проверка на изменение (в реальном проекте лучше глубокое сравнение)
        if (JSON.stringify(oldTagIds.sort()) !== JSON.stringify(newTagIds.sort())) {
            changes.tagIds = newTagIds;
            // Обновим имена тегов в UI
            row.tags = newTagIds.map(id => {
                const t = tags.find(tag => tag.id === id);
                return t ? t.name : 'Unknown';
            });
        }

        if (Object.keys(changes).length === 0) return;

        try {
            await expensesApi.update(row.id, changes);
            message.success('Изменения сохранены');

            newData.splice(index, 1, { ...oldItem, ...row, ...changes });
            setDataSource(newData);
        } catch (error) {
            message.error('Ошибка при сохранении');
        }
    };

    const handleDelete = async (key: React.Key) => {
        const item = dataSource.find(d => d.key === key);
        if (!item) return;

        try {
            await expensesApi.delete(item.id);
            message.success('Трата удалена');
            setDataSource(dataSource.filter((item) => item.key !== key));
        } catch (error) {
            message.error('Ошибка при удалении');
        }
    };

    // Опции для Select
    const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));
    const tagOptions = tags.map(t => ({ label: t.name, value: t.id }));

    // Определение колонок
    const defaultColumns: (TableProps<Expense>['columns'][number] & {
        editable?: boolean;
        dataIndex: keyof Expense | 'tagIds'; // Добавляем виртуальное поле tagIds
        inputType?: 'number' | 'text';
        selectOptions?: any[];
        isMultiSelect?: boolean;
    })[] = [
        {
            title: 'Категория',
            dataIndex: 'categoryId', // Редактируем ID, но отображаем Name? Нет, проще редактировать ID и рендерить Name
            width: '15%',
            editable: true,
            selectOptions: categoryOptions,
            render: (_, record: any) => {
                // Ищем имя категории по ID для отображения
                const cat = categories.find(c => c.id === record.categoryId);
                return cat ? cat.name : record.categoryName;
            }
        },
        {
            title: 'Сумма (₽)',
            dataIndex: 'amount',
            width: '10%',
            editable: true,
            inputType: 'number',
            render: (text) => <Text strong>{Number(text).toLocaleString()}</Text>,
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            width: '25%',
            editable: true,
            inputType: 'text',
            render: (text) => text || <Text type="secondary">Нет описания</Text>,
        },
        {
            title: 'Теги',
            dataIndex: 'tagIds', // Используем виртуальное поле для редактирования
            width: '25%',
            editable: true,
            isMultiSelect: true,
            selectOptions: tagOptions,
            render: (_, record: any) => (
                <>
                    {(record.tags || []).map((tag: string) => (
                        <Tag key={tag} color="blue">{tag}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Действия',
            dataIndex: 'operation',
            width: '10%',
            render: (_, record) => (
                <Popconfirm title="Удалить трату?" onConfirm={() => handleDelete(record.key)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record: any) => ({
                record,
                editable: col.editable,
                dataIndex: col.dataIndex,
                title: col.title,
                inputType: col.inputType,
                selectOptions: col.selectOptions,
                isMultiSelect: col.isMultiSelect,
                handleSave,
            }),
        };
    });

    const components = {
        body: {
            row: EditableRow,
            cell: EditableCell,
        },
    };

    const totalAmount = dataSource.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <div style={{ padding: '24px' }}>
            <style>{`
                .editable-cell-value-wrap:hover {
                    border: 1px solid #d9d9d9;
                    border-radius: 2px;
                    padding: 4px 11px !important;
                    background-color: rgba(255,255,255, 0.05);
                }
            `}</style>

            <Flex gap="large" align="start">
                <div style={{ width: 350, flexShrink: 0 }}>
                    <Card title="Выберите дату" bordered={false}>
                        <Calendar
                            value={selectedDate}
                            onSelect={onSelect}
                            disabledDate={disabledDate}
                            fullscreen={false}
                        />
                    </Card>
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Text type="secondary">
                            Выбрано: {selectedDate.format('DD MMMM YYYY')}
                        </Text>
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <Card
                        title={
                            <Flex justify="space-between" align="center">
                                <span>Траты за {selectedDate.format('DD.MM.YYYY')}</span>
                                <Text type="success" style={{ fontSize: 18, fontWeight: 'bold' }}>
                                    Итого: {totalAmount.toLocaleString()} ₽
                                </Text>
                            </Flex>
                        }
                        extra={
                            <Button type="primary" icon={<PlusOutlined />}>
                                Добавить трату
                            </Button>
                        }
                    >
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Spin size="large" />
                            </div>
                        ) : dataSource.length === 0 ? (
                            <Empty description="Нет трат за этот день." />
                        ) : (
                            <Table<any>
                                components={components}
                                rowClassName={() => 'editable-row'}
                                bordered
                                dataSource={dataSource}
                                columns={columns as TableProps<any>['columns']}
                                pagination={false}
                                scroll={{ y: 400 }}
                            />
                        )}
                    </Card>
                </div>
            </Flex>
        </div>
    );
};

export default Expenses;