import React, {useState} from 'react';
import {Card, Button, Typography, message, Flex, Tag, Modal} from 'antd';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { useNavigate } from 'react-router';
import {
    ShoppingOutlined,
    BarChartOutlined,
    WalletOutlined,
    UserOutlined,
    DeleteOutlined,
    LogoutOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text, Link } = Typography;

const Profile: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);


    const handleDelete = async () => {
        try {
            await authApi.deleteAccount();
            logout();
            message.warning('Аккаунт удален');
            navigate('/sign-in');
        } catch {
            message.error('Ошибка при удалении');
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    const handleLogout = async () => {
        try {
            await authApi.logout();
            logout();
            message.success('Вы вышли из аккаунта');
            navigate('/sign-in');
        } catch {
            message.error('Ошибка при удалении');
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
            <Card title={<Flex align="center" gap="middle"><UserOutlined /> Профиль пользователя</Flex>}>
                <Flex vertical gap="large">

                    <div>
                        <Title level={4} style={{ marginBottom: 8 }}>Добро пожаловать, {user}!</Title>
                        <Text type="secondary">
                            Это ваше личное пространство для учета финансов. Ниже представлена краткая инструкция по использованию приложения.
                        </Text>
                    </div>


                    <div>
                        <Title level={5}>📖 Как пользоваться приложением</Title>

                        <Paragraph>
                            Приложение позволяет отслеживать расходы, устанавливать бюджеты и анализировать траты.
                        </Paragraph>

                        <Flex vertical gap="small">
                            <Paragraph>
                                <Tag icon={<ShoppingOutlined />} color="blue">Траты</Tag>
                                <br />
                                На главной странице вы видите календарь и список операций за выбранный день.
                                <ul>
                                    <li>Кликните на дату в календаре, чтобы увидеть траты за этот день.</li>
                                    <li>Синие точки на календаре означают дни, когда были совершены покупки.</li>
                                    <li>Нажмите кнопку <Text strong>"Добавить"</Text>, чтобы создать новую трату.</li>
                                    <li>Кликайте прямо на ячейки таблицы (сумма, описание, категория), чтобы быстро редактировать данные.</li>
                                </ul>
                            </Paragraph>

                            <Paragraph>
                                <Tag icon={<WalletOutlined />} color="green">Бюджеты</Tag>
                                <br />
                                В разделе <Link onClick={() => navigate('/budgets')}>Бюджеты</Link> вы можете установить лимиты расходов по категориям.
                                Если сумма трат за месяц превысит лимит, система предупредит вас при создании новой операции.
                            </Paragraph>

                            <Paragraph>
                                <Tag icon={<BarChartOutlined />} color="purple">Статистика</Tag>
                                <br />
                                Раздел <Link onClick={() => navigate('/statistics')}>Статистика</Link> показывает круговую диаграмму ваших расходов.
                                Вы можете выбрать период (неделя, месяц, год) и увидеть, на какие категории уходит больше всего денег.
                            </Paragraph>
                        </Flex>
                    </div>


                    <div>
                        <Title level={5} style={{ color: '#ff4d4f' }}>⚠️ Опасная зона</Title>
                        <Flex vertical gap="middle" style={{ width: '100%' }}>
                            <Button
                                icon={<LogoutOutlined />}
                                block
                                onClick={() => handleLogout()}
                            >
                                Выйти из аккаунта
                            </Button>

                            <Button
                                icon={<DeleteOutlined />}
                                danger
                                block
                                onClick={() => setIsDeleteModalOpen(true)}
                            >
                                Удалить аккаунт навсегда
                            </Button>
                        </Flex>
                    </div>

                </Flex>
            </Card>
            <Modal
                title={
                    <Flex align="center" gap="middle">
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '24px' }} />
                        <span>Удаление аккаунта</span>
                    </Flex>
                }
                open={isDeleteModalOpen}
                onOk={handleDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                okText="Да, удалить"
                cancelText="Отмена"
                okButtonProps={{ danger: true }}
                centered
            >
                <p>
                    Вы уверены, что хотите безвозвратно удалить свой аккаунт?
                </p>
                <p style={{ color: '#888', fontSize: '14px' }}>
                    Все ваши траты, установленные бюджеты и персональные настройки будут удалены. Это действие нельзя отменить.
                </p>
            </Modal>
        </div>
    );
};

export default Profile;