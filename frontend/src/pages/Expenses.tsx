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
    Empty
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { expensesApi, type Expense, type UpdateExpenseDto } from '../api/expenses';
import type { CalendarProps } from 'antd';

const { Text } = Typography;

// --- Типы для таблицы ---
type FormInstance<T> = GetRef<typeof Form<T>>;

const EditableContext = React.createContext<FormInstance<any> | null>(null);

interface EditableRowProps {
    index: number;
}

// Компонент строки таблицы с контекстом формы
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

interface EditableCellProps {
    title: React.ReactNode;
    editable: boolean;
    dataIndex: keyof Expense;
    record: Expense;
    handleSave: (record: Expense) => void;
    inputType: 'number' | 'text';
}

// Компонент ячейки таблицы с логикой редактирования
const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
                                                                                title,
                                                                                editable,
                                                                                children,
                                                                                dataIndex,
                                                                                record,
                                                                                handleSave,
                                                                                inputType,
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
        // Инициализируем форму текущим значением
        form.setFieldsValue({ [dataIndex]: record[dataIndex] });
    };

    const save = async () => {
        try {
            const values = await form.validateFields();

            // Обработка числового поля
            let processedValues = { ...values };
            if (inputType === 'number' && values[dataIndex] !== undefined) {
                const numValue = Number(values[dataIndex]);
                if (isNaN(numValue)) {
                    throw new Error('Введите корректное число');
                }
                if (numValue <= 0) {
                    throw new Error('Сумма должна быть больше 0');
                }
                processedValues = { [dataIndex]: numValue };
            }

            toggleEdit();
            handleSave({ ...record, ...processedValues });
        } catch (errInfo) {
            console.log('Save failed:', errInfo);
        }
    };

    let childNode = children;

    if (editable) {
        childNode = editing ? (
            <Form.Item
                style={{ margin: 0 }}
                name={dataIndex}
                rules={[
                    { required: true, message: `${title} обязательно.` }
                ]}
                getValueFromEvent={(e) => {
                    // Для number полей преобразуем значение
                    if (inputType === 'number') {
                        return e.target.value;
                    }
                    return e.target.value;
                }}
            >
                {inputType === 'number' ? (
                    <Input
                        ref={inputRef}
                        onPressEnter={save}
                        onBlur={save}
                        type="number"
                        min={0.01}
                        step="0.01"
                        placeholder="Введите сумму"
                    />
                ) : (
                    <Input
                        ref={inputRef}
                        onPressEnter={save}
                        onBlur={save}
                        type="text"
                        placeholder="Введите описание"
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

    // Загрузка данных при изменении даты
    useEffect(() => {
        loadExpenses(selectedDate);
    }, [selectedDate]);

    const loadExpenses = async (date: Dayjs) => {
        setLoading(true);
        try {
            const dateString = date.format('YYYY-MM-DD');
            const response = await expensesApi.getByDate(dateString);

            // Маппинг для AntD Table: добавляем key
            const mappedData = response.data.map(item => ({
                ...item,
                key: item.id.toString()
            }));

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

    // Обработчик сохранения изменений ячейки
    const handleSave = async (row: Expense) => {
        const newData = [...dataSource];
        const index = newData.findIndex((item) => row.key === item.key);

        // Определяем, что изменилось
        const oldItem = newData[index];
        const changes: UpdateExpenseDto = {};

        if (oldItem.amount !== row.amount) changes.amount = row.amount;
        if (oldItem.description !== row.description) changes.description = row.description;

        // Если ничего не изменилось, не шлем запрос
        if (Object.keys(changes).length === 0) return;

        try {
            await expensesApi.update(row.id, changes);
            message.success('Изменения сохранены');

            // Обновляем локальный стейт
            newData.splice(index, 1, { ...oldItem, ...changes });
            setDataSource(newData);
        } catch (error) {
            message.error('Ошибка при сохранении');
            // Можно откатить изменения в UI, если нужно
        }
    };

    const handleDelete = async (key: React.Key) => {
        // Находим ID по ключу
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

    // Определение колонок таблицы
    const defaultColumns: (TableProps<Expense>['columns'][number] & { editable?: boolean; dataIndex: keyof Expense; inputType?: 'number' | 'text' })[] = [
        {
            title: 'Категория',
            dataIndex: 'categoryName',
            width: '15%',
        },
        {
            title: 'Сумма (₽)',
            dataIndex: 'amount',
            width: '15%',
            editable: true,
            inputType: 'number',
            render: (text) => <Text strong>{Number(text).toLocaleString()}</Text>,
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            width: '30%',
            editable: true,
            inputType: 'text',
            render: (text) => text || <Text type="secondary">Нет описания</Text>,
        },
        {
            title: 'Теги',
            dataIndex: 'tags',
            width: '25%',
            render: (_, record: Expense) => (
                <>
                    {record.tags.map(tag => (
                        <Tag key={tag} color="blue">{tag}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Действия',
            dataIndex: 'operation',
            width: '15%',
            render: (_, record) =>
                dataSource.length >= 1 ? (
                    <Popconfirm title="Удалить трату?" onConfirm={() => handleDelete(record.key)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ) : null,
        },
    ];

    // Применяем логику редактирования к колонкам
    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record: Expense) => ({
                record,
                editable: col.editable,
                dataIndex: col.dataIndex,
                title: col.title,
                inputType: col.inputType,
                handleSave,
            }),
        };
    });

    // Компоненты для кастомизации рендеринга строк и ячеек
    const components = {
        body: {
            row: EditableRow,
            cell: EditableCell,
        },
    };

    const totalAmount = dataSource.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <div style={{ padding: '24px' }}>
            {/* Добавляем глобальные стили для hover эффекта на редактируемых ячейках */}
            <style>{`
        .editable-cell-value-wrap:hover {
          border: 1px solid #d9d9d9;
          border-radius: 2px;
          padding: 4px 11px !important;
          background-color: rgba(255,255,255, 0.05);
        }
      `}</style>

            <Flex gap="large" align="start">

                {/* ЛЕВАЯ КОЛОНКА: КАЛЕНДАРЬ */}
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

                {/* ПРАВАЯ КОЛОНКА: ТАБЛИЦА ТРАТ */}
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
                            <Empty description="Нет трат за этот день. Нажмите 'Добавить трату'." />
                        ) : (
                            <Table<Expense>
                                components={components}
                                rowClassName={() => 'editable-row'}
                                bordered
                                dataSource={dataSource}
                                columns={columns as TableProps<Expense>['columns']}
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