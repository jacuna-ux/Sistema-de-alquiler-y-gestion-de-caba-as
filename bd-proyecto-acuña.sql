DROP DATABASE IF EXISTS pehuen_co;
CREATE DATABASE pehuen_co;
USE pehuen_co;

CREATE TABLE rol (
    id_rol INT NOT NULL AUTO_INCREMENT,
    nombre_rol VARCHAR(30) NOT NULL,
    PRIMARY KEY (id_rol)
);

CREATE TABLE usuario (
    id_usuario INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    dni VARCHAR(15) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(100),
    nombre_usuario VARCHAR(50) NOT NULL,
    contrasena_encriptada VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    PRIMARY KEY (id_usuario),
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
);

CREATE TABLE cabana (
    id_cabana INT NOT NULL AUTO_INCREMENT,
    nombre_identificador VARCHAR(50) NOT NULL,
    capacidad_maxima INT NOT NULL,
    descripcion_equipamiento VARCHAR(500),
    precio_por_noche INT NOT NULL,
    PRIMARY KEY (id_cabana)
);

CREATE TABLE reserva (
    id_reserva INT NOT NULL AUTO_INCREMENT,
    fecha_ingreso DATE NOT NULL,
    fecha_egreso DATE NOT NULL,
    estado VARCHAR(20) NOT NULL,
    id_usuario INT NOT NULL,
    id_cabana INT NOT NULL,
    PRIMARY KEY (id_reserva),
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    FOREIGN KEY (id_cabana) REFERENCES cabana (id_cabana)
);

CREATE TABLE pago (
    id_pago INT NOT NULL AUTO_INCREMENT,
    monto INT NOT NULL,
    fecha_hora_pago DATETIME NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL,
    id_reserva INT NOT NULL,
    PRIMARY KEY (id_pago),
    FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva)
);

CREATE TABLE comprobante (
    id_comprobante INT NOT NULL AUTO_INCREMENT,
    ruta_archivo_digital VARCHAR(255) NOT NULL,
    fecha_carga DATE NOT NULL,
    id_pago INT NOT NULL,
    PRIMARY KEY (id_comprobante),
    FOREIGN KEY (id_pago) REFERENCES pago (id_pago)
);

INSERT INTO rol (nombre_rol) VALUES
('Encargada'),
('Cliente');

INSERT INTO usuario (nombre, apellido, dni, telefono, email, nombre_usuario, contrasena_encriptada, id_rol) VALUES
('Encargada', 'Pehuen Co', '00000000', NULL, NULL, 'encargada', SHA2('encargada2026', 256), 1);

INSERT INTO cabana (nombre_identificador, capacidad_maxima, descripcion_equipamiento, precio_por_noche) VALUES
('Cabaña 1', 2, 'Casa alpina chica para 2 personas. Dormitorio con cama matrimonial en planta alta, cocina comedor con heladera frigobar, TV, wifi, vajilla completa, baño con ducha de agua fría y caliente, aire acondicionado y fogón. A 4 cuadras del mar.', 38000),
('Cabaña 2', 2, 'Cabaña para hasta 2 personas con cama matrimonial, TV con Star+ y Disney+, cocina comedor con vajilla completa, heladera con freezer, aire acondicionado, baño con agua fría y caliente y fogón independiente. A 4 cuadras del mar.', 38000),
('La Delfina', 4, 'Casa para 4 personas con dos habitaciones: una con cama matrimonial y otra con 2 camas simples. Comedor con vajilla completa, TV por cable, heladera con freezer, futón, aire acondicionado, cochera techada, fogón, amplio patio con árboles y pileta exclusiva. En el predio compartido.', 55000),
('Cabaña 4', 6, 'Cabaña para hasta 6 personas, a 5 cuadras del mar, en el predio compartido. Cocina comedor amplio con TV, vajilla completa, heladera con freezer, 2 habitaciones (una con cama matrimonial y otra con cama simple y cucheta), aire acondicionado portátil, wifi, garaje cerrado con fogón y baño con mampara con agua fría y caliente.', 70000),
('Cabaña 5', 3, 'Cabaña monoambiente para hasta 3 personas con cama matrimonial y cama simple. Cocina sin horno, vajilla completa, heladera con freezer, baño con agua fría y caliente, wifi, aire acondicionado, TV y chulengo con parrilla. A 5 cuadras del mar, en el predio compartido.', 48000),
('Cabaña 6', 4, 'Cabaña alpina para 4 personas, a 5 cuadras del mar, en el predio compartido. Cocina con horno, baño con agua fría y caliente, heladera con freezer, sillón en planta baja, TV, aire acondicionado, wifi y vajilla completa. Planta alta con cama matrimonial y 2 camas simples.', 55000);
