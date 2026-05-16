import React from 'react';
import { Layout as AntLayout, Menu, Button, Space } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';

const { Header, Content, Footer } = AntLayout;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await authApi.logout();
            logout();
            navigate('/sign-in');
        } catch (e) {
            console.error(e);
        }
    };

    // Элементы меню
    const menuItems = [
        {
            key: '/me',
            icon: <UserOutlined />,
            label: <Link to="/me">Профиль</Link>,
        },
        // Сюда можно добавить другие разделы, например "Траты"
    ];

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                    ERP FinTech
                </div>

                <Space>
                    {/* Меню навигации (если нужно) */}
                    <Menu
                        theme="dark"
                        mode="horizontal"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        style={{ minWidth: 0, flex: 'none', background: 'transparent' }}
                    />

                    {/* Кнопка входа или Профиль */}
                    {user ? (
                        <Space>
                            <span style={{ color: 'white' }}>{user}</span>
                            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                                Выход
                            </Button>
                        </Space>
                    ) : (
                        <Button type="primary" onClick={() => navigate('/sign-in')}>
                            Вход
                        </Button>
                    )}
                </Space>
            </Header>

            <Content style={{ padding: '24px', minHeight: 'calc(100vh - 134px)' }}>
                {children}
            </Content>

            <Footer style={{ textAlign: 'center' }}>
                @ERP FinTech 2026
            </Footer>
        </AntLayout>
    );
};

export default AppLayout;